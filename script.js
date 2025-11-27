// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const processBtn = document.getElementById('processBtn');
const resultsContent = document.getElementById('resultsContent');
const loading = document.getElementById('loading');
const sensitivity = document.getElementById('sensitivity');
const sensitivityValue = document.getElementById('sensitivityValue');
const autoResolve = document.getElementById('autoResolve');

// Store uploaded files
let uploadedFiles = [];

// Event Listeners
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
processBtn.addEventListener('click', processFiles);
sensitivity.addEventListener('input', updateSensitivity);

// Update sensitivity value display
function updateSensitivity() {
    sensitivityValue.textContent = sensitivity.value;
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.style.borderColor = '#4fc3f7';
    uploadArea.style.backgroundColor = '#f0f7ff';
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.style.borderColor = '#ddd';
    uploadArea.style.backgroundColor = '#f9f9f9';
}

// Handle file drop
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave(e);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// Handle file selection via input
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// Process and display selected files
function handleFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Only add if not already in the list
        if (!uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
            uploadedFiles.push(file);
            addFileToList(file);
        }
    }
    
    // Reset file input to allow selecting the same file again if needed
    fileInput.value = '';
    
    // Enable process button if we have files
    updateProcessButton();
}

// Add file to the file list UI
function addFileToList(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <div class="file-info">
            <i class="fas fa-file-alt file-icon"></i>
            <span>${file.name}</span>
            <small>(${formatFileSize(file.size)})</small>
        </div>
        <button class="remove-file" data-name="${file.name}" data-size="${file.size}">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    fileList.appendChild(fileItem);
    
    // Add event listener to remove button
    const removeBtn = fileItem.querySelector('.remove-file');
    removeBtn.addEventListener('click', removeFile);
}

// Remove file from the list
function removeFile(e) {
    const fileName = e.currentTarget.getAttribute('data-name');
    const fileSize = parseInt(e.currentTarget.getAttribute('data-size'));
    
    // Remove from UI
    e.currentTarget.closest('.file-item').remove();
    
    // Remove from array
    uploadedFiles = uploadedFiles.filter(f => !(f.name === fileName && f.size === fileSize));
    
    // Update process button state
    updateProcessButton();
}

// Update process button state based on file count
function updateProcessButton() {
    processBtn.disabled = uploadedFiles.length === 0;
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Process the uploaded files
async function processFiles() {
    if (uploadedFiles.length === 0) return;
    
    // Show loading
    showLoading(true);
    
    try {
        // Simulate processing time (in a real app, this would be actual processing)
        await simulateProcessing();
        
        // Generate results
        const results = generateResults();
        
        // Display results
        displayResults(results);
        
    } catch (error) {
        console.error('Error processing files:', error);
        showError('حدث خطأ أثناء معالجة الملفات. يرجى المحاولة مرة أخرى.');
    } finally {
        // Hide loading
        showLoading(false);
    }
}

// Simulate file processing
function simulateProcessing() {
    return new Promise(resolve => {
        // Simulate network/processing delay
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}

// Generate sample results (in a real app, this would analyze the files)
function generateResults() {
    const results = [];
    const sensitivityLevel = parseInt(sensitivity.value);
    
    // Sample results based on sensitivity
    if (sensitivityLevel >= 7) {
        results.push({
            type: 'warning',
            title: 'تم اكتشاف تكرار محتمل',
            message: 'يوجد تشابه بنسبة 85% بين الملفين "المحاضرة1.pdf" و "المحاضرة2.pdf"',
            files: ['المحاضرة1.pdf', 'المحاضرة2.pdf'],
            resolution: autoResolve.checked ? 'تم دمج الملفات تلقائيًا' : 'يتطلب مراجعة يدوية'
        });
    }
    
    if (sensitivityLevel >= 5) {
        results.push({
            type: 'success',
            title: 'تمت معالجة الملفات بنجاح',
            message: 'تم فحص جميع الملفات بنجاح',
            files: uploadedFiles.map(f => f.name),
            resolution: 'لا توجد مشاكل في التكرار'
        });
    }
    
    return results;
}

// Display results in the UI
function displayResults(results) {
    // Clear previous results
    resultsContent.innerHTML = '';
    
    if (results.length === 0) {
        resultsContent.innerHTML = '<p class="empty-state">لا توجد نتائج للعرض</p>';
        return;
    }
    
    results.forEach(result => {
        const resultItem = document.createElement('div');
        resultItem.className = `result-item result-${result.type}`;
        
        let filesList = '';
        if (result.files && result.files.length > 0) {
            filesList = `<p><strong>الملفات:</strong> ${result.files.join(', ')}</p>`;
        }
        
        resultItem.innerHTML = `
            <h3>${result.title}</h3>
            <p>${result.message}</p>
            ${filesList}
            ${result.resolution ? `<p><strong>الحل:</strong> ${result.resolution}</p>` : ''}
        `;
        
        resultsContent.appendChild(resultItem);
    });
}

// Show loading overlay
function showLoading(show) {
    if (show) {
        loading.classList.add('active');
    } else {
        loading.classList.remove('active');
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'result-item result-error';
    errorDiv.innerHTML = `
        <h3>خطأ</h3>
        <p>${message}</p>
    `;
    
    resultsContent.innerHTML = '';
    resultsContent.appendChild(errorDiv);
}

// Initialize
updateSensitivity();
updateProcessButton();
