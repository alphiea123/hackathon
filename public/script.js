// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        // Clear previous inputs
        clearInputs();
    });
});

// File upload handling
const fileUploadArea = document.getElementById('file-upload-area');
const audioInput = document.getElementById('audio-input');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');
const submitAudioBtn = document.getElementById('submit-audio');

fileUploadArea.addEventListener('click', () => audioInput.click());

audioInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

removeFileBtn.addEventListener('click', () => {
    audioInput.value = '';
    fileInfo.classList.add('hidden');
    fileUploadArea.classList.remove('hidden');
    submitAudioBtn.disabled = true;
});

function handleFileSelect(file) {
    if (!file.type.startsWith('audio/')) {
        showError('Please upload an audio file (MP3, WAV, M4A, etc.)');
        return;
    }
    
    fileName.textContent = file.name;
    fileInfo.classList.remove('hidden');
    fileUploadArea.classList.add('hidden');
    submitAudioBtn.disabled = false;
}

// Submit handlers
document.getElementById('submit-transcript').addEventListener('click', async () => {
    const transcript = document.getElementById('transcript-input').value.trim();
    
    if (!transcript) {
        showError('Please enter a transcript');
        return;
    }
    
    await processTranscript(transcript);
});

submitAudioBtn.addEventListener('click', async () => {
    const file = audioInput.files[0];
    if (!file) {
        showError('Please select an audio file');
        return;
    }
    
    await processAudio(file);
});

async function processAudio(file) {
    setLoading(true);
    hideError();
    
    try {
        // Step 1: Transcribe audio
        const formData = new FormData();
        formData.append('audio', file);
        
        const transcribeResponse = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
        });
        
        if (!transcribeResponse.ok) {
            const error = await transcribeResponse.json();
            throw new Error(error.error || 'Transcription failed');
        }
        
        const { transcript } = await transcribeResponse.json();
        
        if (!transcript) {
            throw new Error('No transcript generated from audio');
        }
        
        // Step 2: Generate summary and slides
        await processTranscript(transcript);
        
    } catch (error) {
        showError(error.message || 'Failed to process audio file');
        setLoading(false);
    }
}

async function processTranscript(transcript) {
    setLoading(true);
    hideError();
    
    try {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transcript })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate summary');
        }
        
        const data = await response.json();
        displayResults(data);
        
    } catch (error) {
        showError(error.message || 'Failed to generate summary');
    } finally {
        setLoading(false);
    }
}

function displayResults(data) {
    const resultsSection = document.getElementById('results-section');
    const summaryContent = document.getElementById('summary-content');
    const slidesContent = document.getElementById('slides-content');
    
    // Display summary
    summaryContent.textContent = data.summary || 'No summary generated';
    
    // Display slides preview
    if (data.slides && data.slides.length > 0) {
        const preview = data.slides.slice(0, 3).map((slide, idx) => {
            return `Slide ${idx + 1}: ${slide.title}\n${slide.points.map(p => `  • ${p}`).join('\n')}`;
        }).join('\n\n');
        slidesContent.textContent = preview;
        if (data.slides.length > 3) {
            slidesContent.textContent += `\n\n... and ${data.slides.length - 3} more slides`;
        }
    } else {
        slidesContent.textContent = 'No slides generated';
    }
    
    // Store full data for modal
    window.slidesData = data.slides || [];
    window.summaryData = data.summary || '';
    
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Modal handling
const slidesModal = document.getElementById('slides-modal');
const modalSlidesContent = document.getElementById('modal-slides-content');
const closeModalBtn = document.getElementById('close-modal');
const prevSlideBtn = document.getElementById('prev-slide');
const nextSlideBtn = document.getElementById('next-slide');
const slideCounter = document.getElementById('slide-counter');

let currentSlideIndex = 0;

document.getElementById('view-slides').addEventListener('click', () => {
    if (!window.slidesData || window.slidesData.length === 0) {
        showError('No slides available');
        return;
    }
    
    currentSlideIndex = 0;
    renderSlides();
    slidesModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    slidesModal.classList.add('hidden');
});

slidesModal.addEventListener('click', (e) => {
    if (e.target === slidesModal) {
        slidesModal.classList.add('hidden');
    }
});

prevSlideBtn.addEventListener('click', () => {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        renderSlides();
    }
});

nextSlideBtn.addEventListener('click', () => {
    if (currentSlideIndex < window.slidesData.length - 1) {
        currentSlideIndex++;
        renderSlides();
    }
});

function renderSlides() {
    if (!window.slidesData || window.slidesData.length === 0) {
        modalSlidesContent.innerHTML = '<p>No slides available</p>';
        return;
    }
    
    const slides = window.slidesData.map((slide, idx) => {
        const points = slide.points.map(p => `<li>${p}</li>`).join('');
        return `
            <div class="slide ${idx === currentSlideIndex ? 'active' : ''}">
                <h2>${slide.title}</h2>
                <ul>${points}</ul>
            </div>
        `;
    }).join('');
    
    modalSlidesContent.innerHTML = slides;
    
    // Update counter and navigation
    slideCounter.textContent = `Slide ${currentSlideIndex + 1} of ${window.slidesData.length}`;
    prevSlideBtn.disabled = currentSlideIndex === 0;
    nextSlideBtn.disabled = currentSlideIndex === window.slidesData.length - 1;
}

// Download summary
document.getElementById('download-summary').addEventListener('click', () => {
    if (!window.summaryData) {
        showError('No summary available to download');
        return;
    }
    
    const blob = new Blob([window.summaryData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Edit slides functionality
const editModal = document.getElementById('edit-modal');
const editSlidesContent = document.getElementById('edit-slides-content');
const closeEditModalBtn = document.getElementById('close-edit-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveEditsBtn = document.getElementById('save-edits');

document.getElementById('edit-slides').addEventListener('click', () => {
    if (!window.slidesData || window.slidesData.length === 0) {
        showError('No slides available to edit');
        return;
    }
    
    renderEditSlides();
    editModal.classList.remove('hidden');
});

closeEditModalBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

cancelEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
        editModal.classList.add('hidden');
    }
});

saveEditsBtn.addEventListener('click', () => {
    saveEditedSlides();
    editModal.classList.add('hidden');
    showError('Slides updated successfully!');
    setTimeout(hideError, 3000);
});

function renderEditSlides() {
    if (!window.slidesData || window.slidesData.length === 0) {
        editSlidesContent.innerHTML = '<p>No slides available</p>';
        return;
    }
    
    const editHTML = window.slidesData.map((slide, idx) => {
        const pointsHTML = slide.points.map((point, pIdx) => `
            <div class="point-item">
                <input type="text" value="${escapeHtml(point)}" data-slide="${idx}" data-point="${pIdx}" placeholder="Bullet point">
                <button type="button" class="remove-point" onclick="removePoint(${idx}, ${pIdx})">×</button>
            </div>
        `).join('');
        
        return `
            <div class="edit-slide-item">
                <h3>Slide ${idx + 1}</h3>
                <input type="text" value="${escapeHtml(slide.title)}" data-slide="${idx}" data-field="title" placeholder="Slide Title">
                <div class="points-container" data-slide="${idx}">
                    ${pointsHTML}
                </div>
                <button type="button" class="add-point-btn" onclick="addPoint(${idx})">+ Add Point</button>
            </div>
        `;
    }).join('');
    
    editSlidesContent.innerHTML = editHTML;
    
    // Add event listeners for title changes
    editSlidesContent.querySelectorAll('input[data-field="title"]').forEach(input => {
        input.addEventListener('input', (e) => {
            const slideIdx = parseInt(e.target.dataset.slide);
            window.slidesData[slideIdx].title = e.target.value;
        });
    });
    
    // Add event listeners for point changes
    editSlidesContent.querySelectorAll('input[data-point]').forEach(input => {
        input.addEventListener('input', (e) => {
            const slideIdx = parseInt(e.target.dataset.slide);
            const pointIdx = parseInt(e.target.dataset.point);
            window.slidesData[slideIdx].points[pointIdx] = e.target.value;
        });
    });
}

window.addPoint = function(slideIdx) {
    if (!window.slidesData[slideIdx].points) {
        window.slidesData[slideIdx].points = [];
    }
    window.slidesData[slideIdx].points.push('');
    renderEditSlides();
};

window.removePoint = function(slideIdx, pointIdx) {
    window.slidesData[slideIdx].points.splice(pointIdx, 1);
    renderEditSlides();
};

function saveEditedSlides() {
    // Update preview
    displayResults({ summary: window.summaryData, slides: window.slidesData });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export to HTML
function exportToHTML() {
    if (!window.slidesData || window.slidesData.length === 0) {
        showError('No slides available to export');
        return;
    }
    
    const slidesHTML = window.slidesData.map((slide, idx) => {
        const points = slide.points.map(p => `<li>${escapeHtml(p)}</li>`).join('');
        return `
            <div class="presentation-slide">
                <h2>${escapeHtml(slide.title)}</h2>
                <ul>${points}</ul>
            </div>
        `;
    }).join('');
    
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Presentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            overflow-x: hidden;
        }
        .presentation-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .presentation-slide {
            min-height: 100vh;
            padding: 4rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            border-bottom: 2px solid #333;
            page-break-after: always;
        }
        .presentation-slide h2 {
            font-size: 3rem;
            margin-bottom: 3rem;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .presentation-slide ul {
            list-style: none;
            text-align: left;
            max-width: 800px;
        }
        .presentation-slide li {
            font-size: 1.5rem;
            padding: 1rem 0;
            padding-left: 2rem;
            position: relative;
            color: #a0a0a0;
        }
        .presentation-slide li::before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #6366f1;
            font-weight: bold;
        }
        @media print {
            .presentation-slide {
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
    <div class="presentation-container">
        ${slidesHTML}
    </div>
</body>
</html>`;
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presentation-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export to PDF
function exportToPDF() {
    if (!window.slidesData || window.slidesData.length === 0) {
        showError('No slides available to export');
        return;
    }
    
    // Create a new window with the presentation
    const printWindow = window.open('', '_blank');
    
    const slidesHTML = window.slidesData.map((slide, idx) => {
        const points = slide.points.map(p => `<li>${escapeHtml(p)}</li>`).join('');
        return `
            <div class="presentation-slide" style="page-break-after: always;">
                <h2>${escapeHtml(slide.title)}</h2>
                <ul>${points}</ul>
            </div>
        `;
    }).join('');
    
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>Meeting Presentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
        }
        .presentation-slide {
            min-height: 100vh;
            padding: 4rem;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            page-break-after: always;
        }
        .presentation-slide h2 {
            font-size: 3rem;
            margin-bottom: 3rem;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .presentation-slide ul {
            list-style: none;
            text-align: left;
            max-width: 800px;
        }
        .presentation-slide li {
            font-size: 1.5rem;
            padding: 1rem 0;
            padding-left: 2rem;
            position: relative;
            color: #a0a0a0;
        }
        .presentation-slide li::before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #6366f1;
            font-weight: bold;
        }
        @media print {
            .presentation-slide {
                page-break-after: always;
            }
        }
    </style>
</head>
<body>
    ${slidesHTML}
</body>
</html>`);
    
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// Export button handlers
document.getElementById('export-html').addEventListener('click', exportToHTML);
document.getElementById('export-pdf').addEventListener('click', exportToPDF);
document.getElementById('export-html-modal').addEventListener('click', () => {
    exportToHTML();
    slidesModal.classList.add('hidden');
});
document.getElementById('export-pdf-modal').addEventListener('click', () => {
    exportToPDF();
    slidesModal.classList.add('hidden');
});

// Utility functions
function setLoading(loading) {
    const buttons = document.querySelectorAll('.submit-btn');
    buttons.forEach(btn => {
        const spinner = btn.querySelector('.spinner');
        const span = btn.querySelector('span');
        if (loading) {
            btn.disabled = true;
            spinner.classList.remove('hidden');
            span.textContent = span.textContent.includes('Generate') ? 'Generating...' : 'Processing...';
        } else {
            btn.disabled = false;
            spinner.classList.add('hidden');
            if (span.textContent.includes('Generating')) {
                span.textContent = 'Generate Summary & Slides';
            } else if (span.textContent.includes('Processing')) {
                span.textContent = 'Transcribe & Generate';
            }
        }
    });
}

function showError(message) {
    const errorEl = document.getElementById('error-message');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    errorEl.scrollIntoView({ behavior: 'smooth' });
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

function clearInputs() {
    document.getElementById('transcript-input').value = '';
    audioInput.value = '';
    fileInfo.classList.add('hidden');
    fileUploadArea.classList.remove('hidden');
    submitAudioBtn.disabled = true;
    hideError();
    document.getElementById('results-section').classList.add('hidden');
}

