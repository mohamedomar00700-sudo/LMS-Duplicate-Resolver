
import { RawUser, MasterEmployee, ProcessedDuplicate, EmailType, MigrationStep, CourseProgress, AppSettings } from '../types';
import { read, utils } from 'xlsx';

// --- Text Normalization Helpers ---

const cleanString = (str: any): string => {
    if (!str) return '';
    // Replace Non-Breaking Spaces (\u00A0), Zero-width spaces (\u200B)
    // AND collapse multiple spaces into one single space
    let text = String(str)
        .replace(/[\u00A0\u200B]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    return text;
};

export const normalizeArabic = (str: string): string => {
    if (!str) return '';
    let text = cleanString(str);
    // Remove diacritics
    text = text.replace(/[\u064B-\u065F]/g, '');
    // Normalize Alef (أ, إ, آ -> ا)
    text = text.replace(/[أإآ]/g, 'ا');
    // Normalize Taa Marbuta (ة -> ه)
    text = text.replace(/ة/g, 'ه');
    // Normalize Yaa (ى -> ي)
    text = text.replace(/ى/g, 'ي');
    return text;
};

// --- Parsers ---

const detectHeaderRow = (rows: any[][]): number => {
    const primaryKeywords = ['email', 'e-mail', 'mail', 'username', 'user name', 'login', 'user_id'];
    const secondaryKeywords = ['name', 'fullname', 'full name', 'student', 'phone', 'mobile', 'role', 'status', 'id', 'user', 'employee'];
    
    // Scan first 20 rows to find where the actual data table starts
    const limit = Math.min(rows.length, 20);
    
    for (let i = 0; i < limit; i++) {
        const row = rows[i];
        if (!row || (Array.isArray(row) && row.length === 0)) continue;

        const cells = (Array.isArray(row) ? row : Object.values(row)).map(c => cleanString(c));
        
        // 1. Critical: If we find a column explicitly named 'email', this is 99% the header row
        const hasEmailColumn = cells.some(cell => primaryKeywords.some(pk => cell === pk || cell.startsWith(pk + ' ')));
        if (hasEmailColumn) return i;

        // 2. Fallback: Check for other common columns if email matches aren't clear
        let matches = 0;
        cells.forEach((cell) => {
             if (secondaryKeywords.some(k => cell.includes(k))) matches++;
        });

        if (matches >= 2) return i;
    }
    
    return 0; // Default to first row if detection fails
};

// Fallback: If no "Email" header is found, scan data to find which column looks like an email
const detectEmailColumnByContent = (rows: any[][], headerRowIdx: number): number => {
    const limit = Math.min(rows.length, headerRowIdx + 25);
    const colScores: Record<number, number> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = headerRowIdx + 1; i < limit; i++) {
        const row = rows[i];
        if (!row) continue;
        const rowArr = Array.isArray(row) ? row : Object.values(row);
        
        rowArr.forEach((cell, idx) => {
            const val = cleanString(cell);
            // Check for @ symbol and at least one dot, simple heuristic
            if (val.includes('@') && val.includes('.') && val.length > 5) {
                colScores[idx] = (colScores[idx] || 0) + 1;
            }
        });
    }

    // Find column with highest score
    let bestCol = -1;
    let maxScore = 0;
    
    // We require at least 2 rows to look like emails to be confident, or 1 if file is very short
    const threshold = rows.length < 5 ? 1 : 2;

    for (const [col, score] of Object.entries(colScores)) {
        if (score >= threshold && score > maxScore) {
            maxScore = score;
            bestCol = Number(col);
        }
    }
    
    return bestCol;
};

const findColumnIndex = (headers: string[], possibleNames: string[]): number => {
    const lowerHeaders = headers.map(h => cleanString(h));
    for (const name of possibleNames) {
        // Exact match preference or contains
        const idx = lowerHeaders.findIndex(h => h.includes(name.toLowerCase()));
        if (idx !== -1) return idx;
    }
    return -1;
};

// Check explicitly for the statuses mentioned by the user
const isCompletedStatus = (val: any): boolean => {
    if (!val) return false;
    // use cleanString to handle double spaces or hidden chars
    const text = cleanString(val);
    
    // STRICT REQUIREMENT:
    // 1. "Completed"
    // 2. "Completed (achieved pass grade)"
    
    // Must NOT contain "not completed" or "fail"
    if (text.includes('not completed') || text.includes('failed') || text.includes('in progress')) return false;

    // Matches
    if (text === 'completed') return true;
    if (text.includes('completed (achieved pass grade)')) return true;
    
    // Fallback: starts with completed and does NOT have 'not' (double safety)
    if (text.startsWith('completed') && !text.includes('not')) return true;

    return false;
};

export const parseExcel = (buffer: ArrayBuffer, platform: 'Talent' | 'Pharmacy' | 'Master'): RawUser[] | MasterEmployee[] => {
    const wb = read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (data.length === 0) return [];

    const headerRowIdx = detectHeaderRow(data);
    const headers = data[headerRowIdx].map((h: any) => {
        const s = String(h || '').trim();
        return s.length > 0 ? s : undefined; // Convert empty strings to undefined to trigger fallback
    });
    
    const results: any[] = [];

    // Indices
    let emailIdx = findColumnIndex(headers.map(h => h || ''), ['email', 'e-mail', 'mail', 'username', 'user name']);
    
    // Intelligent Fallback: Scan content if header not found
    if (emailIdx === -1) {
        emailIdx = detectEmailColumnByContent(data, headerRowIdx);
    }

    const nameIdx = findColumnIndex(headers.map(h => h || ''), ['fullname', 'full name', 'name', 'student', 'first name']);
    const idIdx = findColumnIndex(headers.map(h => h || ''), ['id', 'user id', 'code', 'employee code']);
    const phoneIdx = findColumnIndex(headers.map(h => h || ''), ['phone', 'mobile', 'contact']);
    const roleIdx = findColumnIndex(headers.map(h => h || ''), ['role', 'job title', 'title', 'position']);
    const lastLoginIdx = findColumnIndex(headers.map(h => h || ''), ['last login', 'last access']);

    // For Master file specific columns
    const officialEmailIdx = findColumnIndex(headers.map(h => h || ''), ['official', 'company email', 'work email']);
    const personalEmailIdx = findColumnIndex(headers.map(h => h || ''), ['personal', 'private']);

    for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        if (platform === 'Master') {
             const official = row[officialEmailIdx] !== -1 ? row[officialEmailIdx] : (emailIdx !== -1 ? row[emailIdx] : null);
             if (!official) continue;

             results.push({
                 employeeCode: (idIdx !== -1 && row[idIdx]) ? String(row[idIdx]) : `EMP-${i}`,
                 fullName: (nameIdx !== -1 && row[nameIdx]) ? String(row[nameIdx]) : 'Unknown',
                 officialEmail: cleanString(official),
                 personalEmail: (personalEmailIdx !== -1 && row[personalEmailIdx]) ? cleanString(row[personalEmailIdx]) : undefined,
                 jobTitle: (roleIdx !== -1 && row[roleIdx]) ? String(row[roleIdx]) : undefined
             });
        } else {
             // If we still can't find an email column, skip.
             if (emailIdx === -1) continue;
             
             const email = row[emailIdx];
             if (!email) continue;

             const completedCourses: string[] = [];
             
             // Scan all columns for completion status
             // If headers are missing (unnamed), use Index as name
             row.forEach((cell: any, idx: number) => {
                 // Skip known metadata columns
                 if (idx === emailIdx || idx === nameIdx || idx === idIdx || idx === phoneIdx) return;

                 // Strict Check: Logic is here. If cell says "Completed...", we add the Header Name to the list.
                 if (isCompletedStatus(cell)) {
                     const colName = headers[idx] || `Column ${idx + 1}`;
                     completedCourses.push(colName);
                 }
             });

             results.push({
                 id: (idIdx !== -1 && row[idIdx]) ? String(row[idIdx]) : `USR-${i}`,
                 fullName: (nameIdx !== -1 && row[nameIdx]) ? String(row[nameIdx]) : 'Unknown',
                 email: cleanString(email),
                 phone: (phoneIdx !== -1 && row[phoneIdx]) ? String(row[phoneIdx]) : undefined,
                 role: (roleIdx !== -1 && row[roleIdx]) ? String(row[roleIdx]) : 'student',
                 lastLogin: (lastLoginIdx !== -1 && row[lastLoginIdx]) ? String(row[lastLoginIdx]) : undefined,
                 completedCourseNames: completedCourses,
                 platform: platform,
                 metadata: {} 
             });
        }
    }
    return results;
};

export const parseCSV = (content: string, platform: 'Talent' | 'Pharmacy' | 'Master'): RawUser[] | MasterEmployee[] => {
    // Detect delimiter (Comma, Semicolon, or Tab)
    const firstLine = content.substring(0, 500);
    const countSemi = (firstLine.match(/;/g) || []).length;
    const countComma = (firstLine.match(/,/g) || []).length;
    const countTab = (firstLine.match(/\t/g) || []).length;
    
    let delimiter = ',';
    if (countTab > countSemi && countTab > countComma) delimiter = '\t';
    else if (countSemi > countComma) delimiter = ';';
    
    const rows: string[][] = [];
    const lines = content.split(/\r?\n/);
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        let row: string[] = [];
        if (delimiter === '\t') {
            row = line.split('\t').map(s => s.replace(/^"|"$/g, '').trim());
        } else if (delimiter === ';') {
             row = line.split(';').map(s => s.replace(/^"|"$/g, '').trim());
        } else {
            // Regex to split by comma ignoring commas inside quotes
            const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (match) {
                row = match.map(s => s.replace(/^"|"$/g, '').trim());
            } else {
                row = line.split(',').map(s => s.trim());
            }
        }
        rows.push(row);
    }

    const headerRowIdx = detectHeaderRow(rows);
    // Note: Don't return empty immediately, try scanning content if header check fails but data exists
    if (rows.length === 0) return [];
    
    const headers = (rows[headerRowIdx] || []).map(h => {
        const s = h.trim();
        return s.length > 0 ? s : undefined;
    });
    
    const results: any[] = [];

    // Indices (Reuse logic)
    let emailIdx = findColumnIndex(headers.map(h => h || ''), ['email', 'e-mail', 'mail', 'username']);
    
    // Intelligent Fallback
    if (emailIdx === -1) {
        emailIdx = detectEmailColumnByContent(rows, headerRowIdx);
    }

    const nameIdx = findColumnIndex(headers.map(h => h || ''), ['fullname', 'full name', 'name', 'student']);
    const idIdx = findColumnIndex(headers.map(h => h || ''), ['id', 'user id', 'code', 'employee code']);
    const phoneIdx = findColumnIndex(headers.map(h => h || ''), ['phone', 'mobile', 'contact']);
    const roleIdx = findColumnIndex(headers.map(h => h || ''), ['role', 'job title', 'title', 'position']);
    const lastLoginIdx = findColumnIndex(headers.map(h => h || ''), ['last login', 'last access']);
    
    // Master specific
    const officialEmailIdx = findColumnIndex(headers.map(h => h || ''), ['official', 'company email', 'work email']);
    const personalEmailIdx = findColumnIndex(headers.map(h => h || ''), ['personal', 'private']);

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

         if (platform === 'Master') {
             const official = (officialEmailIdx !== -1) ? row[officialEmailIdx] : ((emailIdx !== -1) ? row[emailIdx] : null);
             if (!official) continue;
             results.push({
                 employeeCode: (idIdx !== -1 && row[idIdx]) ? String(row[idIdx]) : `EMP-${i}`,
                 fullName: (nameIdx !== -1 && row[nameIdx]) ? String(row[nameIdx]) : 'Unknown',
                 officialEmail: cleanString(official),
                 personalEmail: (personalEmailIdx !== -1 && row[personalEmailIdx]) ? cleanString(row[personalEmailIdx]) : undefined,
                 jobTitle: (roleIdx !== -1 && row[roleIdx]) ? String(row[roleIdx]) : undefined
             });
         } else {
             if (emailIdx === -1) continue;
             const email = row[emailIdx];
             if (!email) continue;
             
             const completedCourses: string[] = [];
             
             // Iterate all columns available in this row
             row.forEach((cell, idx) => {
                 // Skip known metadata columns
                 if (idx === emailIdx || idx === nameIdx || idx === idIdx || idx === phoneIdx) return;
                 
                 // Strict Check Logic applied here too
                 if (isCompletedStatus(cell)) {
                     const colName = headers[idx] || `Column ${idx + 1}`;
                     completedCourses.push(colName);
                 }
             });

             results.push({
                 id: (idIdx !== -1 && row[idIdx]) ? String(row[idIdx]) : `USR-${i}`,
                 fullName: (nameIdx !== -1 && row[nameIdx]) ? String(row[nameIdx]) : 'Unknown',
                 email: cleanString(email),
                 phone: (phoneIdx !== -1 && row[phoneIdx]) ? String(row[phoneIdx]) : undefined,
                 role: (roleIdx !== -1 && row[roleIdx]) ? String(row[roleIdx]) : 'student',
                 lastLogin: (lastLoginIdx !== -1 && row[lastLoginIdx]) ? String(row[lastLoginIdx]) : undefined,
                 completedCourseNames: completedCourses,
                 platform: platform,
                 metadata: {}
             });
         }
    }
    return results;
};

// --- Core Logic ---

// Merge multiple users with same email into ONE consolidated user
const mergeUsersWithSameEmail = (users: RawUser[]): RawUser => {
    if (users.length === 0) throw new Error("Cannot merge empty user list");
    if (users.length === 1) return users[0];
    
    // Take data from first user (name, phone, etc.)
    const merged: RawUser = {
        ...users[0],
        // Merge all completed courses from ALL users
        completedCourseNames: []
    };
    
    // Collect ALL unique courses from all user entries
    const courseSet = new Set<string>();
    users.forEach(u => {
        u.completedCourseNames.forEach(course => {
            courseSet.add(cleanString(course)); // normalized
        });
    });
    
    // Add all unique courses to the merged user
    merged.completedCourseNames = Array.from(courseSet).map(normalized => {
        // Find the original course name (non-normalized) from any user
        for (const user of users) {
            const original = user.completedCourseNames.find(c => cleanString(c) === normalized);
            if (original) return original;
        }
        return normalized;
    });
    
    return merged;
};

const generateDuplicateRecord = (
    userA: RawUser, 
    userB: RawUser, 
    masterMap: Map<string, MasterEmployee>, 
    type: 'Inter-Platform' | 'Intra-Talent' | 'Intra-Pharmacy',
    matchReason: 'Exact Email' | 'Same Phone' | 'Fuzzy Name Match',
    score: number
): ProcessedDuplicate => {
    
    // Count 'Completed' courses found during parsing
    const countA = userA.completedCourseNames.length;
    const countB = userB.completedCourseNames.length;
    
    let primary: 'Talent' | 'Pharmacy' | 'Review Needed' = 'Review Needed';
    let decisionReason = '';
    const warnings: string[] = [];

    // --- GOLDEN RULE: Account with MORE completed courses wins ---
    // If counts are equal, user needs to decide.
    if (countA > countB) {
        primary = 'Talent';
        decisionReason = `Talent account has more completed courses (${countA}) than Pharmacy (${countB}).`;
    } else if (countB > countA) {
        primary = 'Pharmacy';
        decisionReason = `Pharmacy account has more completed courses (${countB}) than Talent (${countA}).`;
    } else {
        // Tie
        primary = 'Review Needed'; 
        decisionReason = `Both platforms have equal course completion count (${countA}). Manual selection recommended (Defaulting to Talent for view).`;
        warnings.push("Equal progress on both platforms. Please manually select the primary account.");
    }

    // Determine Winner and Loser to calculate "What is missing in Winner but present in Loser"
    // CRITICAL FIX: If "Review Needed" (Tie), we default to userA (Talent) as Winner for calculation purposes to prevent crash/empty.
    // The UI must reflect this choice.
    const winner = primary === 'Pharmacy' ? userB : userA; 
    const loser = primary === 'Pharmacy' ? userA : userB;
    
    // Calculate Migration Steps:
    // GAP ANALYSIS LOGIC:
    // 1. Identify courses in the Loser account that are "Completed".
    // 2. Check if the Winner account has the EXACT SAME course marked as "Completed".
    // 3. If NOT (either column missing OR value is 'Not Completed'), it is a gap.
    
    const migrationSteps: MigrationStep[] = [];
    
    // Create a Set of normalized course names that are completed in the Winner's account
    const winnerCourses = new Set(winner.completedCourseNames.map(c => cleanString(c)));
    
    loser.completedCourseNames.forEach(course => {
        // 'course' here is the Column Header Name where the Loser had "Completed" status.
        // We check if the Winner also has this Header in their "Completed List".
        
        if (!winnerCourses.has(cleanString(course))) {
            // SCENARIO 1: Winner file doesn't have this column at all.
            // SCENARIO 2: Winner file has this column, but value is "Not Completed" / "In Progress" / Empty.
            // In both cases, the requirement is to migrate the completion status.
            
            migrationSteps.push({
                courseName: course, 
                primaryProgress: 0,
                secondaryProgress: 100,
                action: `Gap Found: '${course}' is Completed in Secondary but missing in Primary.`
            });
        }
    });

    // Check Master Data
    const master = masterMap.get(userA.email) || masterMap.get(userB.email);
    const emailA_Type = master ? (master.officialEmail === userA.email ? EmailType.OFFICIAL : EmailType.PERSONAL) : EmailType.UNKNOWN;
    const emailB_Type = master ? (master.officialEmail === userB.email ? EmailType.OFFICIAL : EmailType.PERSONAL) : EmailType.UNKNOWN;

    if (emailA_Type === EmailType.PERSONAL && emailB_Type === EmailType.PERSONAL) {
        warnings.push("Both accounts use Personal emails (not found in Master Official list).");
    }

    return {
        id: `${type === 'Inter-Platform' ? 'DUP' : 'INT'}-${Math.floor(Math.random() * 10000)}`,
        type,
        matchReason,
        matchScore: score,
        name: master?.fullName || userA.fullName || userB.fullName,
        employeeCode: master?.employeeCode,
        accountA: userA,
        accountB: userB,
        emailA_Type,
        emailB_Type,
        primaryAccount: primary,
        primaryEmail: primary === 'Pharmacy' ? userB.email : userA.email,
        secondaryEmail: primary === 'Pharmacy' ? userA.email : userB.email,
        decisionReason,
        shouldDeleteSecondary: true, 
        deletionReason: "Duplicate account. Unique progress from this account needs to be merged to Primary.",
        migrationSteps,
        warnings
    };
};

export const processDatasets = (
    talentUsers: RawUser[], 
    pharmUsers: RawUser[], 
    masterList: MasterEmployee[],
    settings: AppSettings
): ProcessedDuplicate[] => {
    
    const duplicates: ProcessedDuplicate[] = [];
    const masterMap = new Map<string, MasterEmployee>();
    masterList.forEach(m => {
        if(m.officialEmail) masterMap.set(cleanString(m.officialEmail), m);
        if(m.personalEmail) masterMap.set(cleanString(m.personalEmail), m);
    });

    // --- PHASE 0: CONSOLIDATE USERS (Merge same email within same platform) ---
    
    // Consolidate Talent Users
    const talentByEmail = new Map<string, RawUser[]>();
    talentUsers.forEach(u => {
        if (!talentByEmail.has(u.email)) {
            talentByEmail.set(u.email, []);
        }
        talentByEmail.get(u.email)!.push(u);
    });
    
    const consolidatedTalentUsers: RawUser[] = [];
    talentByEmail.forEach((users, email) => {
        if (users.length > 1) {
            // Merge multiple rows with same email into ONE
            consolidatedTalentUsers.push(mergeUsersWithSameEmail(users));
        } else {
            consolidatedTalentUsers.push(users[0]);
        }
    });

    // Consolidate Pharmacy Users
    const pharmByEmail = new Map<string, RawUser[]>();
    pharmUsers.forEach(u => {
        if (!pharmByEmail.has(u.email)) {
            pharmByEmail.set(u.email, []);
        }
        pharmByEmail.get(u.email)!.push(u);
    });
    
    const consolidatedPharmUsers: RawUser[] = [];
    pharmByEmail.forEach((users, email) => {
        if (users.length > 1) {
            // Merge multiple rows with same email into ONE
            consolidatedPharmUsers.push(mergeUsersWithSameEmail(users));
        } else {
            consolidatedPharmUsers.push(users[0]);
        }
    });

    // --- PHASE 1: INTER-PLATFORM DUPLICATES (Consolidated users) ---
    const pharmMap = new Map<string, RawUser>();
    consolidatedPharmUsers.forEach(u => pharmMap.set(u.email, u));

    consolidatedTalentUsers.forEach(tUser => {
        const pUser = pharmMap.get(tUser.email);
        
        if (pUser) {
            // Found Exact Match by Email -> It's a duplicate
            duplicates.push(generateDuplicateRecord(tUser, pUser, masterMap, 'Inter-Platform', 'Exact Email', 100));
        }
    });

    return duplicates;
};

// --- Generators ---

export const generateSQLScript = (data: ProcessedDuplicate[]): string => {
    let script = "-- LMS Migration Script\n\n";
    data.forEach(d => {
        if (d.shouldDeleteSecondary) {
            const table = d.primaryAccount === 'Talent' ? 'pharmacy_users' : 'talent_users';
            const email = d.secondaryEmail;
            script += `UPDATE ${table} SET status = 'archived', email = CONCAT(email, '_deleted') WHERE email = '${email}';\n`;
            
            d.migrationSteps.forEach(step => {
                const targetTable = d.primaryAccount === 'Talent' ? 'talent_completions' : 'pharmacy_completions';
                script += `INSERT INTO ${targetTable} (user_email, course_name, status, date) VALUES ('${d.primaryEmail}', '${step.courseName}', 'Completed', NOW());\n`;
            });
            script += "\n";
        }
    });
    return script;
};

export const generatePythonScript = (data: ProcessedDuplicate[]): string => {
    let script = "# LMS Migration Script (Python/Pandas)\nimport pandas as pd\n\nlog = []\n\n";
    data.forEach(d => {
        if (d.shouldDeleteSecondary) {
             script += `# Merge ${d.secondaryEmail} -> ${d.primaryEmail}\n`;
             d.migrationSteps.forEach(step => {
                 script += `log.append({'user': '${d.primaryEmail}', 'course': '${step.courseName}', 'action': 'add_completion'})\n`;
             });
             script += `log.append({'user': '${d.secondaryEmail}', 'action': 'archive'})\n\n`;
        }
    });
    return script;
};

export const generateGapAnalysisCSV = (data: ProcessedDuplicate[]): string => {
    const headers = ['Primary Email', 'Secondary Email', 'Missing Course (Column Name)', 'Platform Source', 'Status in Secondary', 'Status in Primary'];
    let csv = headers.join(',') + '\n';
    
    data.forEach(d => {
        if (d.migrationSteps && d.migrationSteps.length > 0) {
            d.migrationSteps.forEach(step => {
                const sourcePlatform = d.primaryAccount === 'Talent' ? 'Pharmacy' : 'Talent';
                const row = [
                    d.primaryEmail,
                    d.secondaryEmail,
                    `"${step.courseName.replace(/"/g, '""')}"`, 
                    sourcePlatform,
                    "Completed",
                    "Missing or Not Completed" 
                ];
                csv += row.join(',') + '\n';
            });
        }
    });
    
    return csv;
};

// --- Storage ---
export const saveSession = (fileA: string, fileB: string, results: ProcessedDuplicate[], settings: AppSettings) => {
    try {
        localStorage.setItem('lms_resolver_session', JSON.stringify({ fileA, fileB, results, settings }));
    } catch (e) { console.error("Session save failed (quota?)", e); }
};

export const loadSession = () => {
    try {
        const s = localStorage.getItem('lms_resolver_session');
        return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
};
