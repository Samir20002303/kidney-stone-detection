const API_URL = 'http://localhost:8000/predict';

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const predictBtn = document.getElementById('predictBtn');
const newImageBtn = document.getElementById('newImageBtn');
const resultsCard = document.getElementById('results');
const resultsContent = document.getElementById('resultsContent');
const confidenceBadge = document.getElementById('confidenceBadge');
const scanCard = document.getElementById('scanCard');

// Éléments de progression
const progressOverlay = document.getElementById('progressOverlay');
const progressBar = document.getElementById('progressBar');
const progressPercentage = document.getElementById('progressPercentage');
const progressMessage = document.getElementById('progressMessage');
const toastNotification = document.getElementById('toastNotification');
const toastIcon = document.getElementById('toastIcon');
const toastMessage = document.getElementById('toastMessage');

const steps = {
    upload: document.getElementById('stepUpload'),
    preprocess: document.getElementById('stepPreprocess'),
    analysis: document.getElementById('stepAnalysis'),
    results: document.getElementById('stepResults')
};

let currentFile = null;
let currentImageData = null;
let currentDetections = [];
let selectedStoneId = null;
let originalImageData = null;
let imageWithAllBoxes = null;

// Stockage de l'état du zoom pour le préserver
let currentZoomInstance = null;
let currentZoomScale = 1;
let currentZoomTranslateX = 0;
let currentZoomTranslateY = 0;

// ========== PROGRESS & NOTIFICATION FUNCTIONS ==========

function showProgress() {
    progressOverlay.classList.add('active');
}

function hideProgress() {
    progressOverlay.classList.remove('active');
    resetSteps();
    resetProgressBar();
}

function resetSteps() {
    Object.values(steps).forEach(step => {
        step.classList.remove('active', 'completed');
        const iconSpan = step.querySelector('.step-icon');
        if (iconSpan) {
            if (step.id === 'stepUpload') iconSpan.textContent = '📤';
            else if (step.id === 'stepPreprocess') iconSpan.textContent = '🔧';
            else if (step.id === 'stepAnalysis') iconSpan.textContent = '🧠';
            else if (step.id === 'stepResults') iconSpan.textContent = '📊';
        }
    });
}

function resetProgressBar() {
    progressBar.style.width = '0%';
    progressPercentage.textContent = '0%';
}

function updateProgress(stepId, percent, message) {
    progressBar.style.width = `${percent}%`;
    progressPercentage.textContent = `${percent}%`;
    progressMessage.textContent = message;
    
    const stepOrder = ['upload', 'preprocess', 'analysis', 'results'];
    const currentStepIndex = stepOrder.indexOf(stepId);
    
    stepOrder.forEach((step, index) => {
        const stepElement = steps[step];
        if (index < currentStepIndex) {
            stepElement.classList.remove('active');
            stepElement.classList.add('completed');
            const iconSpan = stepElement.querySelector('.step-icon');
            if (iconSpan) iconSpan.textContent = '✅';
        } else if (index === currentStepIndex) {
            stepElement.classList.add('active');
            stepElement.classList.remove('completed');
        } else {
            stepElement.classList.remove('active', 'completed');
        }
    });
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toastIcon.textContent = '✓';
        toastIcon.className = 'toast-icon success';
        toastNotification.style.borderColor = '#10b981';
    } else if (type === 'error') {
        toastIcon.textContent = '✗';
        toastIcon.className = 'toast-icon error';
        toastNotification.style.borderColor = '#ef4444';
    } else {
        toastIcon.textContent = 'ℹ';
        toastIcon.className = 'toast-icon info';
        toastNotification.style.borderColor = '#6366f1';
    }
    
    toastNotification.classList.add('show');
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

// ========== ZOOM FUNCTIONS ==========

function initZoomControls(imageElement, containerElement) {
    if (!imageElement || !containerElement) return;
    
    // Supprimer les anciens contrôles
    const oldControls = containerElement.parentElement?.querySelector('.zoom-controls');
    if (oldControls) oldControls.remove();
    
    const oldIndicator = containerElement.parentElement?.querySelector('.zoom-position-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    // Créer les contrôles de zoom
    const zoomControls = document.createElement('div');
    zoomControls.className = 'zoom-controls';
    zoomControls.innerHTML = `
        <button class="zoom-btn" id="zoomFitBtn" title="Adapter à l'écran">⛶</button>
        <button class="zoom-btn" id="zoomOutBtn" title="Zoom arrière">−</button>
        <span class="zoom-level" id="zoomLevel">100%</span>
        <button class="zoom-btn" id="zoomInBtn" title="Zoom avant">+</button>
    `;
    
    const positionIndicator = document.createElement('div');
    positionIndicator.className = 'zoom-position-indicator';
    positionIndicator.id = 'zoomPositionIndicator';
    positionIndicator.textContent = '🔍 100%';
    
    containerElement.parentElement.appendChild(zoomControls);
    containerElement.parentElement.appendChild(positionIndicator);
    
    // Variables locales
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let translateStart = { x: 0, y: 0 };
    
    const minScale = 0.5;
    const maxScale = 4;
    
    // RESTAURER l'état précédent du zoom si disponible
    if (currentZoomScale > 1 || currentZoomTranslateX !== 0 || currentZoomTranslateY !== 0) {
        scale = currentZoomScale;
        translateX = currentZoomTranslateX;
        translateY = currentZoomTranslateY;
    }
    
    function getBounds() {
        const containerRect = containerElement.getBoundingClientRect();
        const imageRect = imageElement.getBoundingClientRect();
        
        const scaledWidth = imageRect.width * scale;
        const scaledHeight = imageRect.height * scale;
        
        let maxX = 0, maxY = 0;
        
        if (scaledWidth > containerRect.width) {
            maxX = (scaledWidth - containerRect.width) / 2;
        }
        if (scaledHeight > containerRect.height) {
            maxY = (scaledHeight - containerRect.height) / 2;
        }
        
        return { minX: -maxX, maxX: maxX, minY: -maxY, maxY: maxY };
    }
    
    function updateTransform() {
        const bounds = getBounds();
        translateX = Math.max(bounds.minX, Math.min(bounds.maxX, translateX));
        translateY = Math.max(bounds.minY, Math.min(bounds.maxY, translateY));
        
        imageElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        
        const percent = Math.round(scale * 100);
        const zoomLevelSpan = document.getElementById('zoomLevel');
        const zoomIndicatorSpan = document.getElementById('zoomPositionIndicator');
        if (zoomLevelSpan) zoomLevelSpan.textContent = `${percent}%`;
        if (zoomIndicatorSpan) zoomIndicatorSpan.innerHTML = `🔍 ${percent}% ${scale > 1 ? '| ✋ Glisser' : ''}`;
        
        containerElement.style.cursor = scale > 1 ? 'grab' : 'default';
        
        // SAUVEGARDER l'état du zoom
        currentZoomScale = scale;
        currentZoomTranslateX = translateX;
        currentZoomTranslateY = translateY;
        currentZoomInstance = { scale, translateX, translateY };
    }
    
    function zoomAt(clientX, clientY, newScale) {
        const oldScale = scale;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        if (newScale === oldScale) return;
        
        const rect = containerElement.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        const ratio = newScale / oldScale;
        translateX = (translateX - x) * ratio + x;
        translateY = (translateY - y) * ratio + y;
        scale = newScale;
        
        updateTransform();
    }
    
    function zoomIn() {
        const rect = containerElement.getBoundingClientRect();
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale * 1.2);
    }
    
    function zoomOut() {
        const rect = containerElement.getBoundingClientRect();
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale * 0.8);
    }
    
    function fitToScreen() {
        const containerRect = containerElement.getBoundingClientRect();
        const imageRect = imageElement.getBoundingClientRect();
        const scaleX = containerRect.width / imageRect.width;
        const scaleY = containerRect.height / imageRect.height;
        const newScale = Math.min(scaleX, scaleY, 1);
        scale = newScale;
        translateX = 0;
        translateY = 0;
        updateTransform();
    }
    
    function handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomAt(e.clientX, e.clientY, scale * delta);
    }
    
    function startDrag(e) {
        if (scale <= 1) return;
        e.preventDefault();
        isDragging = true;
        dragStart.x = e.clientX;
        dragStart.y = e.clientY;
        translateStart.x = translateX;
        translateStart.y = translateY;
        containerElement.style.cursor = 'grabbing';
    }
    
    function onDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        translateX = translateStart.x + (e.clientX - dragStart.x);
        translateY = translateStart.y + (e.clientY - dragStart.y);
        updateTransform();
    }
    
    function stopDrag() {
        isDragging = false;
        containerElement.style.cursor = scale > 1 ? 'grab' : 'default';
    }
    
    function handleDoubleClick(e) {
        e.preventDefault();
        if (scale > 1) {
            fitToScreen();
        } else {
            zoomAt(e.clientX, e.clientY, 2);
        }
    }
    
    // Support tactile
    let touchStart = null;
    let touchScaleStart = null;
    let initialDistance = 0;
    
    function getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function handleTouchStart(e) {
        if (e.touches.length === 1 && scale > 1) {
            e.preventDefault();
            const touch = e.touches[0];
            touchStart = {
                x: touch.clientX,
                y: touch.clientY,
                translateX: translateX,
                translateY: translateY
            };
        } else if (e.touches.length === 2) {
            e.preventDefault();
            initialDistance = getTouchDistance(e.touches);
            touchScaleStart = scale;
            touchStart = null;
        }
    }
    
    function handleTouchMove(e) {
        if (e.touches.length === 1 && touchStart && scale > 1) {
            e.preventDefault();
            const touch = e.touches[0];
            translateX = touchStart.translateX + (touch.clientX - touchStart.x);
            translateY = touchStart.translateY + (touch.clientY - touchStart.y);
            updateTransform();
        } else if (e.touches.length === 2 && touchScaleStart) {
            e.preventDefault();
            const newDistance = getTouchDistance(e.touches);
            const newScale = touchScaleStart * (newDistance / initialDistance);
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            zoomAt(centerX, centerY, newScale);
        }
    }
    
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomFitBtn = document.getElementById('zoomFitBtn');
    
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (zoomFitBtn) zoomFitBtn.addEventListener('click', fitToScreen);
    
    containerElement.addEventListener('wheel', handleWheel, { passive: false });
    containerElement.addEventListener('mousedown', startDrag);
    containerElement.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
    containerElement.addEventListener('touchstart', handleTouchStart);
    containerElement.addEventListener('touchmove', handleTouchMove);
    containerElement.addEventListener('touchend', () => {
        touchStart = null;
        touchScaleStart = null;
    });
    
    // Appliquer immédiatement l'état sauvegardé
    updateTransform();
    
    const cleanup = function() {
        if (zoomInBtn) zoomInBtn.removeEventListener('click', zoomIn);
        if (zoomOutBtn) zoomOutBtn.removeEventListener('click', zoomOut);
        if (zoomFitBtn) zoomFitBtn.removeEventListener('click', fitToScreen);
        containerElement.removeEventListener('wheel', handleWheel);
        containerElement.removeEventListener('mousedown', startDrag);
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    };
    
    return cleanup;
}

// ========== UPLOAD WITH PROGRESS ==========

function uploadWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        
        formData.append('file', file);
        xhr.open('POST', API_URL);
        xhr.send(formData);
    });
}

// ========== DRAWING FUNCTIONS ==========

async function drawDetectionBox(imageData, detection, isSelected = false, drawOnlySelected = false) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            ctx.drawImage(img, 0, 0);
            
            if (drawOnlySelected && !isSelected) {
                resolve(canvas.toDataURL());
                return;
            }
            
            const [x1, y1, x2, y2] = detection.bbox;
            const color = isSelected ? 'rgb(255, 59, 48)' : `rgb(${detection.color[0]}, ${detection.color[1]}, ${detection.color[2]})`;
            const lineWidth = isSelected ? 4 : 2;
            
            // ========== DESSINER UNIQUEMENT LA BOUNDING BOX ==========
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.shadowBlur = 0;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            
            // Effet de lueur pour la sélection
            if (isSelected) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = color;
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                ctx.shadowBlur = 0;
            }
            
            // ========== SUPPRIMÉ : Plus de numéro/label ==========
            // Le code suivant est COMMENTÉ ou SUPPRIMÉ
            /*
            const label = `#${detection.id + 1}`;
            ctx.font = `bold ${Math.max(14, Math.floor(canvas.width / 50))}px Inter`;
            ctx.fillStyle = color;
            ctx.shadowBlur = 0;
            
            const textMetrics = ctx.measureText(label);
            const textWidth = textMetrics.width;
            const textHeight = parseInt(ctx.font);
            const padding = 6;
            
            ctx.fillStyle = color;
            ctx.fillRect(x1, y1 - textHeight - padding, textWidth + padding * 2, textHeight + padding);
            
            ctx.fillStyle = '#fff';
            ctx.fillText(label, x1 + padding, y1 - padding);
            */
            
            resolve(canvas.toDataURL());
        };
        img.src = imageData;
    });
}

async function drawAllBoxes(imageData, detections, selectedId = null, soloMode = false) {
    if (!detections.length) return imageData;
    
    let currentImage = imageData;
    
    if (soloMode && selectedId !== null) {
        const selectedDetection = detections.find(d => d.id === selectedId);
        if (selectedDetection) {
            currentImage = await drawDetectionBox(currentImage, selectedDetection, true, true);
        }
    } else {
        for (const detection of detections) {
            currentImage = await drawDetectionBox(currentImage, detection, selectedId === detection.id, false);
        }
    }
    
    return currentImage;
}

// ========== RESET FUNCTION ==========

function resetToNewImage() {
    // Réinitialiser toutes les variables
    currentFile = null;
    currentImageData = null;
    currentDetections = [];
    selectedStoneId = null;
    originalImageData = null;
    imageWithAllBoxes = null;
    
    // Réinitialiser l'UI
    preview.innerHTML = '';
    preview.classList.add('hidden');
    uploadArea.classList.remove('hidden');
    predictBtn.disabled = true;
    resultsCard.classList.add('hidden');
    newImageBtn.style.display = 'none';
    
    // Réinitialiser le file input
    fileInput.value = '';

    fileInput.click();
    
    showToast('Sélectionnez une nouvelle image à analyser', 'info');
}

function resetZoomForImage() {
    // Forcer la réinitialisation via l'interface
    const fitBtn = document.getElementById('zoomFitBtn');
    if (fitBtn) {
        fitBtn.click();
    }
}

// ========== EVENT HANDLERS ==========

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    scanCard.style.borderColor = '#6366f1';
    scanCard.style.transform = 'scale(1.01)';
});
uploadArea.addEventListener('dragleave', () => {
    scanCard.style.borderColor = 'rgba(99,102,241,0.3)';
    scanCard.style.transform = 'scale(1)';
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    scanCard.style.borderColor = 'rgba(99,102,241,0.3)';
    scanCard.style.transform = 'scale(1)';
    handleFile(e.dataTransfer.files[0]);
});

newImageBtn.addEventListener('click', resetToNewImage);

fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Format non supporté. Utilisez PNG, JPG ou JPEG', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('Fichier trop volumineux. Maximum 10MB', 'error');
        return;
    }
    
    currentFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        originalImageData = e.target.result;
        currentImageData = e.target.result;
        preview.innerHTML = `<img src="${currentImageData}" alt="Aperçu">`;
        preview.classList.remove('hidden');
        uploadArea.classList.add('hidden');
        predictBtn.disabled = false;
        resultsCard.classList.add('hidden');
        newImageBtn.style.display = 'flex';
        selectedStoneId = null;
        currentDetections = [];
        imageWithAllBoxes = null;
        showToast('Image chargée avec succès', 'success');
    };
    reader.onerror = () => {
        showToast('Erreur lors du chargement de l\'image', 'error');
    };
    reader.readAsDataURL(file);
}

predictBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    
    predictBtn.disabled = true;
    predictBtn.querySelector('.btn-text').textContent = 'Analyse...';
    resultsCard.classList.add('hidden');
    
    showProgress();
    
    try {
        updateProgress('upload', 0, 'Préparation du fichier...');
        await new Promise(r => setTimeout(r, 500));
        
        let uploadProgress = 0;
        const data = await uploadWithProgress(currentFile, (percent) => {
            uploadProgress = percent;
            const totalPercent = Math.round(percent * 0.3);
            updateProgress('upload', totalPercent, `Téléchargement... ${percent}%`);
        });
        
        updateProgress('upload', 30, 'Téléchargement terminé !');
        await new Promise(r => setTimeout(r, 300));
        
        updateProgress('preprocess', 35, 'Prétraitement de l\'image...');
        await new Promise(r => setTimeout(r, 800));
        updateProgress('preprocess', 50, 'Optimisation des contrastes...');
        await new Promise(r => setTimeout(r, 500));
        updateProgress('preprocess', 60, 'Normalisation terminée');
        await new Promise(r => setTimeout(r, 300));
        
        updateProgress('analysis', 65, 'Analyse par intelligence artificielle...');
        await new Promise(r => setTimeout(r, 500));
        updateProgress('analysis', 75, 'Détection des calculs rénaux...');
        await new Promise(r => setTimeout(r, 800));
        
        if (data.success) {
            currentDetections = data.detections;
            imageWithAllBoxes = await drawAllBoxes(originalImageData, currentDetections, null, false);
            updateProgress('analysis', 85, `✓ ${data.count} calcul(s) détecté(s)`);
            await new Promise(r => setTimeout(r, 400));
        } else {
            throw new Error('Erreur API');
        }
        
        updateProgress('results', 90, 'Génération du rapport...');
        await new Promise(r => setTimeout(r, 500));
        
        displayResults(data);
        
        updateProgress('results', 100, 'Analyse terminée !');
        await new Promise(r => setTimeout(r, 500));
        
        showToast(`Analyse terminée : ${data.count} calcul(s) détecté(s)`, 'success');
        
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion au serveur. Vérifiez que l\'API est lancée', 'error');
        
        resultsContent.innerHTML = `
            <div class="detection-result">
                <div class="detection-icon">⚠️</div>
                <div class="detection-title">Erreur de connexion</div>
                <div class="detection-desc">Vérifiez que l'API est lancée sur http://localhost:8000</div>
                <div class="detection-badges">
                    <span class="badge">API Status: Offline</span>
                </div>
            </div>
        `;
        confidenceBadge.textContent = 'Hors ligne';
        resultsCard.classList.remove('hidden');
    } finally {
        setTimeout(() => {
            hideProgress();
        }, 300);
        
        predictBtn.disabled = false;
        predictBtn.querySelector('.btn-text').textContent = 'Lancer l\'analyse';
    }
});

async function selectStone(stoneId) {
    if (selectedStoneId === stoneId) {
        selectedStoneId = null;
        const analysisImage = document.getElementById('analysisImage');
        if (analysisImage && imageWithAllBoxes) {
            analysisImage.src = imageWithAllBoxes;
            showToast('Vue normale restaurée', 'info');
            // ⚠️ NE PAS réinitialiser le zoom ici !
            // On garde le zoom actuel
        }
    } else {
        selectedStoneId = stoneId;
        const soloImage = await drawAllBoxes(originalImageData, currentDetections, selectedStoneId, true);
        const analysisImage = document.getElementById('analysisImage');
        if (analysisImage) {
            analysisImage.src = soloImage;
            showToast(`Pierre #${stoneId + 1} isolée`, 'info');
            // ⚠️ NE PAS réinitialiser le zoom ici non plus !
        }
    }
    
    // Attendre que l'image soit chargée puis restaurer le zoom
    const analysisImage = document.getElementById('analysisImage');
    if (analysisImage) {
        // Attendre le chargement de la nouvelle image
        analysisImage.onload = () => {
            // Restaurer l'état du zoom
            const container = document.querySelector('.image-container');
            if (container && currentZoomInstance) {
                const img = analysisImage;
                const scale = currentZoomInstance.scale;
                const translateX = currentZoomInstance.translateX;
                const translateY = currentZoomInstance.translateY;
                img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
                
                // Mettre à jour l'affichage
                const zoomLevelSpan = document.getElementById('zoomLevel');
                const zoomIndicatorSpan = document.getElementById('zoomPositionIndicator');
                if (zoomLevelSpan) zoomLevelSpan.textContent = `${Math.round(scale * 100)}%`;
                if (zoomIndicatorSpan) zoomIndicatorSpan.innerHTML = `🔍 ${Math.round(scale * 100)}% ${scale > 1 ? '| ✋ Glisser' : ''}`;
            }
        };
        if (analysisImage.complete) {
            analysisImage.onload();
        }
    }
    
    updateStoneCardsHighlight();
}

function updateStoneCardsHighlight() {
    const stoneCards = document.querySelectorAll('.stone-card');
    stoneCards.forEach(card => {
        const stoneId = parseInt(card.getAttribute('data-stone-id'));
        if (selectedStoneId === stoneId) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    const selectedStone = selectedStoneId !== null ? currentDetections.find(s => s.id === selectedStoneId) : null;
    const selectedDetailsHtml = selectedStone ? generateSelectedDetailsHtml(selectedStone) : '';
    
    const selectedDetailsContainer = document.getElementById('selectedDetailsContainer');
    if (selectedDetailsContainer) {
        selectedDetailsContainer.innerHTML = selectedDetailsHtml;
    }
}

function generateSelectedDetailsHtml(stone) {
    // Générer les recommandations sous forme de liste HTML
    const recommendationsHtml = stone.recommendations && stone.recommendations.length > 0 ? `
        <div class="selected-section">
            <div class="selected-section-title">
                <span>💊</span> Recommandations
            </div>
            <ul class="recommendations-list">
                ${stone.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : '';
    
    // Déterminer la couleur du risque
    const riskColor = stone.risk_level === "Élevé" ? "#ef4444" : 
                      (stone.risk_level === "Modéré" ? "#f59e0b" : "#10b981");
    
    // Niveau de confiance
    const confidenceText = stone.confidence_level || (stone.confidence > 0.7 ? 'Élevée' : stone.confidence > 0.5 ? 'Moyenne' : 'Faible');
    const confidenceColor = stone.confidence > 0.7 ? '#10b981' : (stone.confidence > 0.5 ? '#f59e0b' : '#ef4444');
    
    // Diamètre estimé (si non fourni, le calculer)
    const diameter = stone.diameter_estimate_mm || Math.round(Math.sqrt(stone.area) * 0.2);
    
    return `
        <div class="selected-stone-details">
            <!-- En-tête -->
            <div class="selected-header">
                <span class="selected-icon">🔬</span>
                <span>Détails complets - ${stone.stone_id_formatted || `Pierre #${stone.id + 1}`}</span>
            </div>
            
            <!-- Date d'analyse -->
            ${stone.analysis_date ? `
            <div class="analysis-date">
                📅 Analyse du ${stone.analysis_date}
            </div>
            ` : ''}
            
            <!-- 📊 CARTES STATISTIQUES (3 indicateurs clés) -->
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-card-value" style="color: ${confidenceColor}">${stone.confidence_percent}</div>
                    <div class="stat-card-label">Confiance</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${diameter} mm</div>
                    <div class="stat-card-label">Diamètre</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value" style="color: ${riskColor}">${stone.risk_level || 'Non évalué'}</div>
                    <div class="stat-card-label">Risque</div>
                </div>
            </div>
            
            <!-- TABLEAU des détails détaillés -->
            <table class="details-table">
                <tr>
                    <td class="details-label">Confiance</td>
                    <td class="details-value">
                        <span style="color: ${confidenceColor}; font-weight: bold;">${stone.confidence_percent}</span>
                        <span class="confidence-badge-${confidenceText.toLowerCase()}">${confidenceText}</span>
                    </td>
                </tr>
                <tr>
                    <td class="details-label">Taille</td>
                    <td class="details-value">${stone.size_category}</td>
                </tr>
                <tr>
                    <td class="details-label">Position</td>
                    <td class="details-value">${stone.position}</td>
                </tr>
                <tr>
                    <td class="details-label">Dimensions</td>
                    <td class="details-value">${Math.round(stone.width)} × ${Math.round(stone.height)} px</td>
                </tr>
                <tr>
                    <td class="details-label">Surface</td>
                    <td class="details-value">${Math.round(stone.area)} px²</td>
                </tr>
                <tr>
                    <td class="details-label">Diamètre estimé</td>
                    <td class="details-value">${diameter} mm</td>
                </tr>
                <tr>
                    <td class="details-label">Niveau de risque</td>
                    <td class="details-value" style="color: ${riskColor}; font-weight: bold;">${stone.risk_level || 'Non évalué'}</td>
                </tr>
                ${stone.density_description ? `
                <tr>
                    <td class="details-label">Densité estimée</td>
                    <td class="details-value">${stone.density_description}</td>
                </tr>
                ` : ''}
                <tr>
                    <td class="details-label">Type présumé</td>
                    <td class="details-value">${stone.stone_type || 'Non déterminé'}</td>
                </tr>
                <tr>
                    <td class="details-label">Prochain contrôle</td>
                    <td class="details-value">${stone.follow_up_timing || 'À définir'}</td>
                </tr>
                ${stone.estimated_passing_time ? `
                <tr>
                    <td class="details-label">Évacuation estimée</td>
                    <td class="details-value">${stone.estimated_passing_time}</td>
                </tr>
                ` : ''}
             </table>
            
            <!-- Recommandations -->
            ${recommendationsHtml}
            
            <!-- Conseils médicaux -->
            ${stone.medical_advice && stone.medical_advice.length > 0 ? `
            <div class="selected-section">
                <div class="selected-section-title">
                    <span>🏥</span> Conseils médicaux
                </div>
                <ul class="recommendations-list medical">
                    ${stone.medical_advice.map(advice => `<li>${advice}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            <!-- Pied de page -->
            <div class="report-footer">
                <div class="report-id">
                    🆔 ID Rapport: ${stone.stone_id_formatted || `NEPHRO-${stone.id + 1}`}
                </div>
                <div class="report-timestamp">
                    Généré par NephroScan AI
                </div>
            </div>
        </div>
    `;
}

// ========== SHARE FUNCTION ==========

async function shareResults() {
    const selectedStone = selectedStoneId !== null ? currentDetections.find(s => s.id === selectedStoneId) : null;
    const stone = selectedStone || (currentDetections.length > 0 ? currentDetections[0] : null);
    
    if (!stone) {
        showToast("Aucune donnée à partager", "error");
        return;
    }
    
    showToast("Préparation du partage...", "info");
    
    try {
        // Générer l'image avec la pierre sélectionnée en évidence
        const highlightedImage = await drawAllBoxes(originalImageData, currentDetections, stone.id, false);
        
        // Créer le texte du rapport
        const shareText = `🔬 NEPHROSCAN AI - Rapport d'analyse\n\n` +
                         `📋 ${currentDetections.length} calcul(s) détecté(s)\n` +
                         `🎯 Confiance: ${stone.confidence_percent}\n` +
                         `📏 Taille: ${stone.size_category}\n` +
                         `📍 Position: ${stone.position}\n` +
                         `⚠️ Risque: ${stone.risk_level}\n` +
                         `📅 Analyse: ${new Date().toLocaleString()}\n\n` +
                         `🔗 Généré par NephroScan AI`;
        
        // Vérifier si l'API Web Share est disponible
        if (navigator.share) {
            // Convertir l'image en blob
            const response = await fetch(highlightedImage);
            const blob = await response.blob();
            const file = new File([blob], "nephroscan-analysis.png", { type: "image/png" });
            
            await navigator.share({
                title: 'NephroScan AI - Rapport médical',
                text: shareText,
                files: [file]
            });
            showToast("Partage réussi !", "success");
        } else {
            // Fallback : copier dans le presse-papier
            await navigator.clipboard.writeText(shareText);
            showToast("Rapport copié dans le presse-papier !", "success");
            
            // Option supplémentaire : télécharger l'image
            const link = document.createElement('a');
            link.download = `nephroscan-${stone.stone_id_formatted || 'rapport'}.png`;
            link.href = highlightedImage;
            link.click();
        }
    } catch (error) {
        console.error('Erreur de partage:', error);
        showToast("Erreur lors du partage", "error");
    }
}

// ========== EXPORT PDF FUNCTION ==========

async function exportToPDF() {
    const selectedStone = selectedStoneId !== null ? currentDetections.find(s => s.id === selectedStoneId) : null;
    const stone = selectedStone || (currentDetections.length > 0 ? currentDetections[0] : null);
    
    if (!stone) {
        showToast("Aucune donnée à exporter", "error");
        return;
    }
    
    showToast("Génération du PDF...", "info");

    const highlightedImage = await drawAllBoxes(originalImageData, currentDetections, stone.id, false);
    
    // Créer un élément temporaire pour le rapport
    const reportHTML = generateReportHTML(stone, currentDetections, highlightedImage, selectedStoneId);

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.background = '#ffffff';  // ← Fond BLANC pour le PDF
    tempDiv.style.padding = '20px';
    tempDiv.style.width = '700px';
    tempDiv.innerHTML = reportHTML;
    document.body.appendChild(tempDiv);
    
    try {
        const { jsPDF } = window.jspdf;
        
        // Attendre le chargement des images
        await new Promise(r => setTimeout(r, 500));
        
        // Capturer l'élément avec html2canvas
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            backgroundColor: '#ffffff',  // ← Fond blanc
            logging: false,
            useCORS: true,
            allowTaint: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`NephroScan_Rapport_${stone.stone_id_formatted || 'examen'}.pdf`);
        
        showToast("PDF téléchargé avec succès !", "success");
    } catch (error) {
        console.error('Erreur PDF:', error);
        showToast("Erreur lors de la génération du PDF", "error");
    } finally {
        document.body.removeChild(tempDiv);
    }
}

function generateReportHTML(stone, allDetections, imageSrc, selectedStoneId) {
    const riskColor = stone.risk_level === "Élevé" ? "#dc2626" : 
                      (stone.risk_level === "Modéré" ? "#f59e0b" : "#10b981");
    
    const confidenceText = stone.confidence_level || (stone.confidence > 0.7 ? 'Élevée' : stone.confidence > 0.5 ? 'Moyenne' : 'Faible');
    const diameter = stone.diameter_estimate_mm || Math.round(Math.sqrt(stone.area) * 0.2);
    
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
    const timeStr = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
    const reportNumber = stone.stone_id_formatted || `NS-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${(stone.id+1).toString().padStart(3,'0')}`;
    
    // Légende des détections (compacte)
    const legendHtml = allDetections.length > 1 ? `
        <div style="margin-top: 8px; padding: 8px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                <span style="color: #475569; font-size: 9px; font-weight: 600;">Multiples détections :</span>
                ${allDetections.map(d => `
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <div style="width: 12px; height: 12px; background: rgb(${d.color[0]}, ${d.color[1]}, ${d.color[2]}); border: ${d.id === stone.id ? '1.5px solid #1e293b' : 'none'}; border-radius: 2px;"></div>
                        <span style="color: #334155; font-size: 9px; ${d.id === stone.id ? 'font-weight: 700; color: #0f172a;' : ''}">
                            Calcul ${String.fromCharCode(65 + d.id)} (${d.confidence_percent})
                            ${d.id === stone.id ? '✓' : ''}
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // Avis médical personnalisé
    let medicalOpinionShort = "";
    let opinionBg = "";
    let opinionBorder = "";
    if (stone.risk_level === "Élevé") {
        medicalOpinionShort = "Prise en charge urologique rapide recommandée. Consultation spécialisée nécessaire.";
        opinionBg = "#fef2f2";
        opinionBorder = "#dc2626";
    } else if (stone.risk_level === "Modéré") {
        medicalOpinionShort = "Surveillance clinique et contrôle imagerie dans 1-2 mois. Consultation urologique à discuter.";
        opinionBg = "#fffbeb";
        opinionBorder = "#f59e0b";
    } else {
        medicalOpinionShort = "Surveillance simple avec hydratation adaptée (2-3L/jour). Contrôle échographique dans 6 mois.";
        opinionBg = "#f0fdf4";
        opinionBorder = "#10b981";
    }
    
    return `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 100%; color: #1e293b; line-height: 1.4; background: #ffffff;">
            
            <!-- ========== EN-TÊTE AVEC LOGO ET INFOS ========== -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 3px solid #2563eb;">
                
                <!-- Logo / Titre à gauche -->
                <div>
                    <h1 style="font-size: 22px; font-weight: 700; color: #2563eb; margin: 0;">NEPHROSCAN<span style="color: #0f172a;">AI</span></h1>
                    <p style="color: #64748b; font-size: 8px; margin: 2px 0 0;">Analyse par intelligence artificielle</p>
                </div>
                
                <!-- Infos rapport à droite -->
                <div style="text-align: right;">
                    <p style="color: #475569; font-size: 9px; font-weight: 600; margin: 0;">RAPPORT N° ${reportNumber}</p>
                    <p style="color: #64748b; font-size: 8px; margin: 3px 0 0;">${dateStr} à ${timeStr}</p>
                    <p style="color: #64748b; font-size: 7px; margin: 2px 0 0;">YOLOv8 v.0 | NephroScan AI</p>
                </div>
            </div>
            
            <!-- ========== RÉSULTAT PRINCIPAL ========== -->
            <div style="background: #f0f9ff; padding: 8px 12px; margin-bottom: 15px; border-left: 4px solid #2563eb; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <div>
                        <p style="color: #475569; font-size: 9px; margin: 0; text-transform: uppercase;">Résultat principal</p>
                        <p style="color: #0f172a; font-size: 13px; font-weight: 700; margin: 3px 0 0;">${stone.size_category} · ${stone.position}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: #475569; font-size: 9px; margin: 0; text-transform: uppercase;">Niveau de risque</p>
                        <p style="color: ${riskColor}; font-size: 15px; font-weight: 800; margin: 3px 0 0;">${stone.risk_level || 'Non évalué'}</p>
                    </div>
                </div>
            </div>
            
            <!-- ========== IMAGE ========== -->
            <div style="text-align: center; margin-bottom: 15px; border: 1px solid #e2e8f0; padding: 12px; background: #ffffff; border-radius: 4px;">
                <img src="${imageSrc}" style="max-width: 100%; max-height: 260px; border: 1px solid #cbd5e1; border-radius: 2px;" alt="Analyse">
                <p style="color: #64748b; font-size: 8px; margin-top: 8px;">Figure 1 - Image médicale annotée <span style="color: #dc2626; font-weight: bold;">(cadre rouge = pierre analysée)</span></p>
                ${legendHtml}
            </div>
            
            <!-- ========== DESCRIPTION DÉTAILLÉE ========== -->
            <div style="margin-top: 5px;">
                <h3 style="color: #0f172a; font-size: 12px; font-weight: 600; margin: 0 0 8px 0; border-bottom: 2px solid #2563eb; padding-bottom: 3px;">DESCRIPTION DÉTAILLÉE</h3>
                
                <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
                    <tr style="background: #f8fafc;">
                        <td style="padding: 7px; border: 1px solid #e2e8f0; width: 30%;"><strong>Confiance diagnostique</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${stone.confidence_percent} <span style="color: #64748b;">(${confidenceText})</span></td>
                        <td style="padding: 7px; background: #f8fafc; border: 1px solid #e2e8f0; width: 30%;"><strong>Diamètre maximal</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${diameter} mm</td>
                    </tr>
                    <tr>
                        <td style="padding: 7px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Taille estimée</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${stone.size_category}</td>
                        <td style="padding: 7px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Surface</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${Math.round(stone.area)} mm²</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 7px; border: 1px solid #e2e8f0;"><strong>Localisation</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${stone.position}</td>
                        <td style="padding: 7px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Dimensions</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${Math.round(stone.width)} × ${Math.round(stone.height)} px</td>
                    </tr>
                    <tr>
                        <td style="padding: 7px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Densité estimée</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${stone.density_description || 'Non spécifiée'}</td>
                        <td style="padding: 7px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Composition</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${stone.stone_type || 'Non déterminée'}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td style="padding: 7px; border: 1px solid #e2e8f0;"><strong>Prochain contrôle</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${stone.follow_up_timing || 'À définir'}</td>
                        <td style="padding: 7px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Évacuation estimée</strong></td>
                        <td style="padding: 7px; border: 1px solid #e2e8f0;">${stone.estimated_passing_time || 'Non estimée'}</td>
                    </tr>
                </table>
            </div>
            
            <!-- ========== INTERPRÉTATION ========== -->
            <div style="background: #f8fafc; padding: 10px 12px; margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <p style="color: #334155; font-size: 9px; margin: 0; line-height: 1.4;">
                    <strong>🔍 Interprétation :</strong> Découverte d'une ${stone.size_category.toLowerCase()} localisée au ${stone.position.toLowerCase()}. 
                    La confiance diagnostique est ${confidenceText.toLowerCase()} (${stone.confidence_percent}).
                    ${stone.estimated_passing_time ? `L'évolution spontanée est estimée : ${stone.estimated_passing_time.toLowerCase()}.` : ''}
                </p>
            </div>
            
            <!-- ========== RECOMMANDATIONS ========== -->
            <div style="margin-top: 12px;">
                <h3 style="color: #0f172a; font-size: 12px; font-weight: 600; margin: 0 0 6px 0;">📋 RECOMMANDATIONS</h3>
                <ul style="margin: 0; padding-left: 22px;">
                    ${stone.recommendations ? stone.recommendations.map(rec => `<li style="margin: 4px 0; color: #334155; font-size: 9px;">${rec}</li>`).join('') : '<li style="margin: 4px 0; color: #334155; font-size: 9px;">Consultation urologique recommandée</li>'}
                </ul>
            </div>
            
            <!-- ========== AVIS MÉDICAL ========== -->
            <div style="margin-top: 12px; background: ${opinionBg}; padding: 8px 12px; border-left: 3px solid ${opinionBorder}; border-radius: 4px;">
                <p style="color: #1e293b; font-size: 9px; margin: 0;">
                    <strong>🏥 Avis médical :</strong> ${medicalOpinionShort}
                </p>
            </div>
            
            <!-- ========== PIED DE PAGE ========== -->
            <div style="margin-top: 15px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <p style="color: #94a3b8; font-size: 7px; margin: 0;">Document généré automatiquement par NephroScan AI</p>
                    <p style="color: #cbd5e1; font-size: 7px; margin: 0;">⚠️ À valider par un médecin — Document non contractuel</p>
                </div>
            </div>
            
        </div>
    `;
}
function displayResults(data) {
    const hasStone = data.count > 0;
    
    confidenceBadge.textContent = hasStone ? `${data.count} pierre(s) détectée(s)` : 'Aucune anomalie';
    confidenceBadge.style.background = hasStone ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)';
    
    const stonesListHtml = hasStone ? `
        <div class="stones-list">
            <div class="stones-header">
                <span>📋 Pierres détectées (${data.count})</span>
                <span class="stones-hint">👆 Cliquez sur une pierre pour l'isoler sur l'image</span>
            </div>
            <div class="stones-grid">
                ${data.detections.map(stone => `
                    <div class="stone-card ${selectedStoneId === stone.id ? 'selected' : ''}" 
                         data-stone-id="${stone.id}"
                         onclick="selectStone(${stone.id})"
                         style="border-left-color: rgb(${stone.color[0]}, ${stone.color[1]}, ${stone.color[2]})">
                        <div class="stone-header">
                            <span class="stone-badge" style="background: rgba(${stone.color[0]}, ${stone.color[1]}, ${stone.color[2]}, 0.2)">
                                Pierre #${stone.id + 1}
                            </span>
                            <span class="stone-confidence">${stone.confidence_percent}</span>
                        </div>
                        <div class="stone-details">
                            <div class="stone-detail">
                                <span class="detail-label">📏 Taille:</span>
                                <span class="detail-value">${stone.size_category}</span>
                            </div>
                            <div class="stone-detail">
                                <span class="detail-label">📍 Position:</span>
                                <span class="detail-value">${stone.position}</span>
                            </div>
                            <div class="stone-detail">
                                <span class="detail-label">📐 Dimensions:</span>
                                <span class="detail-value">${Math.round(stone.width)}×${Math.round(stone.height)}px</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    const selectedStone = selectedStoneId !== null ? data.detections.find(s => s.id === selectedStoneId) : null;
    const selectedDetailsHtml = selectedStone ? generateSelectedDetailsHtml(selectedStone) : '';
    
    resultsContent.innerHTML = `
        <div class="detection-result">
            <!-- Image viewer -->
            <div class="image-viewer">
                <div class="image-container" id="imageContainer">
                    <img id="analysisImage" src="${imageWithAllBoxes}" alt="Analyse" style="max-width: 100%; max-height: 500px; object-fit: contain;">
                </div>
            </div>
            
            <!-- Icône et titre -->
            <div class="detection-icon">${hasStone ? '⚠️' : '✅'}</div>
            <div class="detection-title" style="color: ${hasStone ? '#f87171' : '#10b981'}">
                ${hasStone ? `${data.count} calcul(s) rénal(s) détecté(s)` : 'Aucun calcul détecté'}
            </div>
            
            <!-- Liste des pierres -->
            ${stonesListHtml}
            
            <!-- Détails complets -->
            <div id="selectedDetailsContainer">
                ${selectedDetailsHtml}
            </div>
            
            <!-- Badges -->
            <div class="detection-badges" style="margin-top: 16px;">
                <span class="badge">🔬 YOLOv8</span>
                <span class="badge">📊 1300 images</span>
                <span class="badge">⚡ Temps réel</span>
            </div>
            
            <!-- Boutons d'action (3 boutons) -->
            <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: center; flex-wrap: wrap;">
                <button class="btn-primary" id="newAnalysisBtn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 12px 24px;">
                    <span class="btn-icon">📷</span>
                    <span class="btn-text">Nouvelle image</span>
                </button>
                <button class="btn-primary" id="exportPdfBtn" style="background: linear-gradient(135deg, #10b981, #059669); padding: 12px 24px;">
                    <span class="btn-icon">📄</span>
                    <span class="btn-text">Exporter PDF</span>
                </button>
                <button class="btn-primary" id="shareResultsBtn" style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 12px 24px;">
                    <span class="btn-icon">🔗</span>
                    <span class="btn-text">Partager</span>
                </button>
            </div>
        </div>
    `;
    
    // Initialiser le zoom
    const imageElement = document.getElementById('analysisImage');
    const container = document.getElementById('imageContainer');
    if (imageElement && container) {
        imageElement.onload = () => {
            initZoomControls(imageElement, container);
        };
        if (imageElement.complete) {
            initZoomControls(imageElement, container);
        }
    }
    
    // Bouton Nouvelle image
    const newAnalysisBtn = document.getElementById('newAnalysisBtn');
    if (newAnalysisBtn) {
        newAnalysisBtn.addEventListener('click', resetToNewImage);
    }
    
    // Bouton Exporter PDF
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportToPDF);
    }
    
    // Bouton Partager
    const shareResultsBtn = document.getElementById('shareResultsBtn');
    if (shareResultsBtn) {
        shareResultsBtn.addEventListener('click', shareResults);
    }
    
    resultsCard.classList.remove('hidden');
}
window.selectStone = selectStone;