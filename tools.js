const windows = [
    {
        label: "ABCD Crate",
        duration: 500,
    },
    {
        label: "Map Update",
        duration: 240,
    },
    {
        label: "OB Cooldown",
        duration: 500,
    }
];

const clonedImages = [];
let audioURL = null;
let highestZIndex = 1;

function createWindow(data, index, options = {}) {
    const windowElement = document.createElement("div");
    windowElement.className = "window";
    windowElement.dataset.type = "timer";
    windowElement.dataset.label = data.label;

    const columns = 3;
    const windowWidth = 420;
    const windowHeight = 280;

    // Index of -1 means there's custom sizing and/or positioning
    if (index != -1) {
        // Arrange the starting windows in a grid pattern
        const column = (index % columns) + 1;
        const row = Math.floor(index / columns) + 1;
        windowElement.style.left = `${column * windowWidth}px`;
        windowElement.style.top = `${row * windowHeight}px`;
    } else {
        windowElement.style.left = `${options.left ?? 0}px`;
        windowElement.style.top = `${options.top ?? 0}px`;

        if (options.width) {
            windowElement.style.width = `${options.width}px`;
        }

        if (options.height) {
            windowElement.style.height = `${options.height}px`;
        }
    }
    
    windowElement.innerHTML = `
        <div class="titlebar"><span class="title">${data.label}</span><button class="exit">X</button></div>
        <div class="content">
            <input type="number" class="timer" value="${data.duration}">
            <button class="startPause">Start/Stop Timer</button>
            <button class="reset">Reset Timer</button>
        </div>        
    `;

    document.getElementById("window-container")
        .appendChild(windowElement);
    
    setupTimer(windowElement, data.duration);
    makeDraggable(windowElement);
    windowElement.addEventListener("mousedown", function () {
        bringToFront(windowElement);
    });
}

windows.forEach((windowData, index) => {
    createWindow(windowData, index, false);
});


function setupTimer(windowElement, startingDuration) {

    let timeRemaining = startingDuration;
    let timerRunning = false;
    let interval = null;

    const timerInput = windowElement.querySelector(".timer");
    const startPauseButton = windowElement.querySelector(".startPause");
    const resetButton = windowElement.querySelector(".reset");
    const exitButton = windowElement.querySelector(".exit");
    const titlebar = windowElement.querySelector(".titlebar");

    // To change the label color based on whether the timer is ticking
    function setTitlebarColor(color) {
        titlebar.style.color = color;
    }

    setTitlebarColor("#91e5f6");

    // Automatically resize
    const resizeObserver = new ResizeObserver(function (entries) {
        const { width, height } = entries[0].contentRect;
        const timerSize = Math.min(200, Math.max(80, Math.min(width, height) * 0.32));

        windowElement.style.setProperty("--timer-size", `${timerSize}px`);
    });

    resizeObserver.observe(windowElement);

    startPauseButton.addEventListener("click", function () {

        if (timerRunning)
        {
            // Pause timer
            clearInterval(interval);
            timerRunning = false;
            setTitlebarColor("#91e5f6");

        } else {
            // Start timer
            timerRunning = true;
            setTitlebarColor("#16d13f");
            interval = setInterval(function () {

                if (timeRemaining > 0)
                {
                    timeRemaining--;
                    timerInput.value = timeRemaining;
                } else {
                    // Handle timer reaching 0
                    clearInterval(interval);
                    timerRunning = false;
                    setTitlebarColor("#e0314e");

                    // Play sound effect (if uploaded)
                    if (audioURL) {
                        const audio = new Audio(audioURL);
                        audio.play();
                    }
                }

            }, 1000);
        }
    });

    // Set timer duration back to its default value
    resetButton.addEventListener("click", function () {

        clearInterval(interval);

        timeRemaining = startingDuration;
        timerInput.value = timeRemaining;

        timerRunning = false;
        setTitlebarColor("#91e5f6");
    });

    // In case the user manually changes the timer duration
    timerInput.addEventListener("change", function () {

        let newTime = parseInt(timerInput.value);

        if (!isNaN(newTime) && newTime >= 0) {
            timeRemaining = newTime;
        }

    });

    // Close out the timer window
    exitButton.addEventListener("click", function () {
        clearInterval(interval);
        windowElement.remove();
    });
}

function makeDraggable(windowElement) {

    // Make the titlebar of timers and notepads draggable
    const titlebar = windowElement.querySelector(".titlebar");

    let dragging = false;

    let mouseStartX;
    let mouseStartY;

    let windowStartX;
    let windowStartY;

    titlebar.addEventListener("mousedown", function(event) {

        dragging = true;

        mouseStartX = event.clientX;
        mouseStartY = event.clientY;

        windowStartX = windowElement.offsetLeft;
        windowStartY = windowElement.offsetTop;

    });

    document.addEventListener("mousemove", function(event) {

        if (!dragging) return;

        const deltaX = event.clientX - mouseStartX;
        const deltaY = event.clientY - mouseStartY;

        windowElement.style.left = windowStartX + deltaX + "px";
        windowElement.style.top = windowStartY + deltaY + "px";

    });

    document.addEventListener("mouseup", function() {

        dragging = false;

    });
}

function bringToFront(element) {
    highestZIndex++;
    element.style.zIndex = highestZIndex;
}

const labelInput = document.querySelector(".label");
const durationInput = document.querySelector(".duration");

// When a file is uploaded, set the input box's text to the name of the uploaded file
document.querySelectorAll(".file-picker").forEach(function (picker) {
    const fileInput = picker.querySelector(".file-input");
    const fileName = picker.querySelector(".file-name");

    fileInput.addEventListener("change", function () {
        if (fileInput.files.length > 0) {
            fileName.textContent = fileInput.files[0].name;
        }
    });
});

// When an audio file is uploaded, store it in IndexedDB
const timerAudioInput = document.querySelector('input[name="timerAudio"]');
timerAudioInput.addEventListener("change", async function () {
    const audioFile = timerAudioInput.files[0];

    if (audioURL) {
        URL.revokeObjectURL(audioURL);
        audioURL = null;
    }

    if (!audioFile) {
        await clearAudio();
        return;
    }

    audioURL = URL.createObjectURL(audioFile);
    await saveAudio({
        id: "timerAudio",
        file: audioFile,
        name: audioFile.name
    });
});

loadSavedAudio();

const clearAudioButton = document.querySelector(".clearTimerAudio")
clearAudioButton.addEventListener("click", clearAudio)

const createButton = document.querySelector(".createTimer");
createButton.addEventListener("click", createNewTimer);

// Create a custom timer using an inputted label and duration
function createNewTimer() {
    const label = labelInput.value.trim();
    const duration = Number(durationInput.value);

    if (!label || !Number.isFinite(duration) || duration < 0) {
        return;
    }

    createWindow({
        label: label,
        duration: duration,
    }, -1, {
        left: 700,
        top: 5,
        width: 400,
        height: 270,
    });

    labelInput.value = "";
    durationInput.value = "";
}

const cloneButton = document.querySelector(".cloneImage");
cloneButton.addEventListener("click", cloneImage);

// Create a draggable clone of an uploaded image
function cloneImage() {
    const imageInput = document.querySelector('input[name="image"]');
    const imageFile = imageInput.files[0];
    if (!imageFile) {
        return;
    }

    const imageWindow = document.createElement("div");
    imageWindow.className = "cloned-image";
    imageWindow.dataset.type = "image";
    imageWindow.dataset.label = imageFile.name;
    imageWindow.style.left = `${100 + clonedImages.length * 20}px`;
    imageWindow.style.top = `${100 + clonedImages.length * 20}px`;

    const imageElement = document.createElement("img");
    const imageUrl = URL.createObjectURL(imageFile);
    imageElement.src = imageUrl;
    imageWindow.appendChild(imageElement);
    document.body.appendChild(imageWindow);

    // Give the image an ID in case it's saved to the layout later
    const imageID = crypto.randomUUID();
    makeImageDraggable(imageWindow);
    imageWindow.addEventListener("mousedown", function () {
        bringToFront(imageWindow);
    });
    clonedImages.push({
        id: imageID,
        element: imageWindow,
        url: imageUrl,
        file: imageFile
    });
}

const eraseButton = document.querySelector(".erase");
eraseButton.addEventListener("click", eraseImages);

function eraseImages() {
    clonedImages.forEach(function (image) {
        image.element.remove();
        URL.revokeObjectURL(image.url);
    });

    clonedImages.length = 0;
}

function makeImageDraggable(imageWindow) {
    let dragging = false;
    let mouseStartX;
    let mouseStartY;
    let imageStartX;
    let imageStartY;

    imageWindow.addEventListener("mousedown", function (event) {
        dragging = true;
        mouseStartX = event.clientX;
        mouseStartY = event.clientY;
        imageStartX = imageWindow.offsetLeft;
        imageStartY = imageWindow.offsetTop;
        imageWindow.style.cursor = "grabbing";
        event.preventDefault();
    });

    document.addEventListener("mousemove", function (event) {
        if (!dragging) return;

        imageWindow.style.left = `${imageStartX + event.clientX - mouseStartX}px`;
        imageWindow.style.top = `${imageStartY + event.clientY - mouseStartY}px`;
    });

    document.addEventListener("mouseup", function () {
        dragging = false;
        imageWindow.style.cursor = "grab";
    });
}

// Expandables/Tools (custom timer creation, extra settings, notepad creation, info)
const showCustomButton = document.querySelector(".showCustom");
showCustomButton.addEventListener("click", showCustom);

function showCustom() {
    const customPanel = document.querySelector(".custom");
    const extrasPanel = document.querySelector(".extras");
    const infoPanel = document.querySelector(".info");

    customPanel.hidden = !customPanel.hidden;

    if (!customPanel.hidden) {
        extrasPanel.hidden = true;
        infoPanel.hidden = true;
    }
}

const showExtrasButton = document.querySelector(".showExtras");
showExtrasButton.addEventListener("click", showExtras);

function showExtras() {
    const customPanel = document.querySelector(".custom");
    const extrasPanel = document.querySelector(".extras");
    const infoPanel = document.querySelector(".info");

    extrasPanel.hidden = !extrasPanel.hidden;

    if (!extrasPanel.hidden) {
        customPanel.hidden = true;
        infoPanel.hidden = true;
    }
}

const showNotepadButton = document.querySelector(".showNotepad");
showNotepadButton.addEventListener("click", function () {
    showNotepad();
});

function showNotepad(options = {}) {
    const notepadWindow = document.createElement("div");
    notepadWindow.className = "window";
    notepadWindow.dataset.type = "notepad";
    notepadWindow.dataset.label = "Notepad";

    notepadWindow.innerHTML = `
        <div class="titlebar">
            <span class="title">Notepad</span>
            <div class="fontSizing">
            <p style="font-size: 14px;">Font Size:</p>
            <input type="number" class="fontSize" value="18">
            </div>
            <button class="exit">X</button>
        </div>
        <div class="content">
            <textarea class="notepadText" spellcheck="false" style="font-size: 18px;"></textarea>
        </div>
    `;

    // Check if the notepad was created as part of loading a layout or manually
    const hasCustomPosition = options.left !== undefined || options.top !== undefined;

    if (!hasCustomPosition) {
        // default position
        notepadWindow.style.left = "700px";
        notepadWindow.style.top = "5px";
    }
    else {
        notepadWindow.style.left = `${options.left ?? 0}px`;
        notepadWindow.style.top = `${options.top ?? 0}px`;

        if (options.width) {
            notepadWindow.style.width = `${options.width}px`;
        }

        if (options.height) {
            notepadWindow.style.height = `${options.height}px`;
        }
    }
    
    document.getElementById("window-container").appendChild(notepadWindow);

    const fontSize = notepadWindow.querySelector(".fontSize");
    const notepadText = notepadWindow.querySelector(".notepadText")

    // Avoid dragging the notepad window if trying to select the font size input box
    fontSize.addEventListener("mousedown", function (event) {
        event.stopPropagation();
    });

    fontSize.addEventListener("input", function () {
        const size = Number(fontSize.value);

        if (Number.isFinite(size) && size > 0) {
            notepadText.style.fontSize = `${size}px`;
        }
    });

    const exitButton = notepadWindow.querySelector(".exit");
    exitButton.addEventListener("click", function () {
        notepadWindow.remove();
    });
    makeDraggable(notepadWindow);
        bringToFront(notepadWindow);
    notepadWindow.addEventListener("mousedown", function () {
        bringToFront(notepadWindow);
    });
}

const showInfoButton = document.querySelector(".showInfo");
showInfoButton.addEventListener("click", showInfo);

function showInfo() {
    const customPanel = document.querySelector(".custom");
    const extrasPanel = document.querySelector(".extras");
    const infoPanel = document.querySelector(".info");

    infoPanel.hidden = !infoPanel.hidden;

    if (!infoPanel.hidden) {
        customPanel.hidden = true;
        extrasPanel.hidden = true;
    }
}

const saveButton = document.querySelector(".saveLayout");
saveButton.addEventListener("click", saveLayout);
saveButton.addEventListener("click", saveLayoutResponse);

// Layout saving uses a mix of local browser storage and IndexedDB
async function saveLayout() {
    const layout = [];
    await clearImages();

    for (const element of document.querySelectorAll(".window, .cloned-image")) {
        const isWindow = element.classList.contains("window");
        const image = clonedImages.find(item => item.element === element);
        let duration = null;

        if (isWindow) {
            const timerInput = element.querySelector(".timer");
            if (timerInput) {
                duration = Number(timerInput.value || 0);
            } else {
                duration = 0;
            }
        }

        if (image) {
            await saveImage({
                id: image.id,
                file: image.file,
                name: element.dataset.label
            });
        }

        layout.push({
            type: element.dataset.type || element.className,
            label: element.dataset.label || "",
            imageID: image?.id || null,
            duration: duration,
            left: element.offsetLeft,
            top: element.offsetTop,
            width: element.offsetWidth,
            height: element.offsetHeight
        });
    }

    // Save the layout data as a string in local storage
    localStorage.setItem("timerLayout", JSON.stringify(layout));
}

// Briefly change the saveLayout button for better responsiveness
function saveLayoutResponse() {
    const saveButton = document.querySelector(".saveLayout");
    saveButton.textContent = "Saving!";
    saveButton.style.color = "#07691c";

    setTimeout(function () {
        saveButton.textContent = "Save Layout";
        saveButton.style.color = "#133c55";
    }, 2000);
}

const loadButton = document.querySelector(".loadLayout");
loadButton.addEventListener("click", loadLayout);

async function loadLayout() {
    // Load the layout string from local storage
    const layout = JSON.parse(localStorage.getItem("timerLayout") || "[]");
    if (layout.length === 0) {
        return;
    }
    
    // Clear current layout
    document.querySelectorAll(".window, .cloned-image").forEach(element => {
        element.remove();
    });

    clonedImages.forEach(image => {
        URL.revokeObjectURL(image.url);
    });
    clonedImages.length = 0;

    for (const item of layout) {
        // Create timers with same label, duration, location, and scaling
        if (item.type === "timer") {
            createWindow({
                label: item.label,
                duration: item.duration
            }, -1, {
                left: item.left,
                top: item.top,
                width: item.width,
                height: item.height
            });
        }
        
        // Create notepads with same location and scaling
        if (item.type === "notepad") {
            showNotepad({
                left: item.left,
                top: item.top,
                width: item.width,
                height: item.height
            });
        }

        // Create images with the same location
        if (item.type === "image") {
            const imageRef = await getImage(item.imageID);

            if (!imageRef) {
                return;
            }

            const imageURL = URL.createObjectURL(imageRef.file);
            const imageWindow = document.createElement("div");

            imageWindow.className = "cloned-image";
            imageWindow.dataset.type = "image";
            imageWindow.dataset.label = imageRef.name;
            imageWindow.style.left = `${item.left}px`;
            imageWindow.style.top = `${item.top}px`;

            const imageElement = document.createElement("img");
            imageElement.src = imageURL;
            imageWindow.appendChild(imageElement);
            document.body.appendChild(imageWindow);

            makeImageDraggable(imageWindow);
            imageWindow.addEventListener("mousedown", function () {
                bringToFront(imageWindow);
            });

            clonedImages.push({
                id:item.imageID,
                element: imageWindow,
                url: imageURL,
                file: imageRef.file
            });
        }
    }
}

// IndexedDB saving/loading for images and audio
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("timerDatabase", 2);

        request.onupgradeneeded = function () {
            const database = request.result;

            if (!database.objectStoreNames.contains("images")) {
                database.createObjectStore("images", {
                    keyPath: "id"
                });
            }

            if (!database.objectStoreNames.contains("audio")) {
                database.createObjectStore("audio", {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveImage(imageRef) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction("images", "readwrite");
        transaction.objectStore("images").put(imageRef);

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

async function saveAudio(audioRef) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction("audio", "readwrite");
        transaction.objectStore("audio").put(audioRef);

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getImage(id) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = database
            .transaction("images")
            .objectStore("images")
            .get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAudio(id) {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const request = database
            .transaction("audio")
            .objectStore("audio")
            .get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function clearImages() {
    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction("images", "readwrite");
        transaction.objectStore("images").clear();

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

async function clearAudio() {
    if (audioURL) {
        URL.revokeObjectURL(audioURL);
        audioURL = null;
    }

    const database = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction("audio", "readwrite");
        transaction.objectStore("audio").clear();
        const timerAudioInput = document.querySelector('input[name="timerAudio"]');
        const filePicker = timerAudioInput.closest(".file-picker");
        let fileName = null;

        if (filePicker) {
            fileName = filePicker.querySelector(".file-name");
        }
        
        // After removing the uploaded audio, change the file upload text back to normal
        if (fileName) {
            fileName.textContent = "Upload Audio";
        }

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

async function loadSavedAudio() {
    const audioRef = await getAudio("timerAudio");

    if (audioRef) {
        audioURL = URL.createObjectURL(audioRef.file);
        const timerAudioInput = document.querySelector('input[name="timerAudio"]');
        const filePicker = timerAudioInput.closest(".file-picker");
        let fileName = null;

        if (filePicker) {
            fileName = filePicker.querySelector(".file-name");
        }

        // If audio is loaded, change the file upload text to the name of the audio file
        if (fileName) {
            fileName.textContent = audioRef.name;
        }
    }
}
