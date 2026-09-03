// Game Engine for BlockVerse
let scene, camera, renderer, raycaster, mouse;
let objects = [];
let currentTool = 'cube';
let currentColor = '#ff6b6b';
let currentSize = 1;
let isPlaying = false;
let playerController = null;

// Initialize the 3D scene
function initScene() {
    const canvas = document.getElementById('gameCanvas');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7ec850,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.userData.isGround = true;
    scene.add(ground);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0x000000, 0x000000);
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    
    // Raycaster for mouse picking
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Event listeners
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('contextmenu', onCanvasRightClick);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
    
    // Camera controls
    setupCameraControls();
    
    // Start animation loop
    animate();
    
    // Add some example blocks
    addExampleBlocks();
}

function addExampleBlocks() {
    // Add a few starter blocks to show what's possible
    const welcomeBlocks = [
        { type: 'cube', color: '#ff6b6b', position: { x: 0, y: 0.5, z: 0 }, size: 1 },
        { type: 'cube', color: '#4ecdc4', position: { x: 2, y: 0.5, z: 0 }, size: 1 },
        { type: 'sphere', color: '#f9ca24', position: { x: -2, y: 0.5, z: 0 }, size: 1 },
        { type: 'cylinder', color: '#6c5ce7', position: { x: 0, y: 0.5, z: 2 }, size: 1 },
    ];
    
    welcomeBlocks.forEach(block => {
        createBlock(block.type, block.color, block.position, block.size);
    });
}

function createBlock(type, color, position, size) {
    let geometry;
    
    switch(type) {
        case 'cube':
            geometry = new THREE.BoxGeometry(size, size, size);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(size / 2, 32, 32);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(size / 2, size / 2, size, 32);
            break;
        default:
            geometry = new THREE.BoxGeometry(size, size, size);
    }
    
    const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.7,
        metalness: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { type, color, size, removable: true };
    
    scene.add(mesh);
    objects.push(mesh);
    
    return mesh;
}

function onCanvasClick(event) {
    if (isPlaying) return;
    
    updateMousePosition(event);
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        
        if (currentTool === 'delete') {
            if (intersect.object.userData.removable) {
                scene.remove(intersect.object);
                objects = objects.filter(obj => obj !== intersect.object);
            }
        } else {
            // Place block on surface
            const normal = intersect.face.normal.clone();
            normal.transformDirection(intersect.object.matrixWorld);
            
            const newPosition = intersect.point.clone().add(normal.multiplyScalar(currentSize / 2));
            newPosition.x = Math.round(newPosition.x);
            newPosition.y = Math.max(currentSize / 2, Math.round(newPosition.y));
            newPosition.z = Math.round(newPosition.z);
            
            createBlock(currentTool, currentColor, newPosition, currentSize);
        }
    }
}

function onCanvasRightClick(event) {
    event.preventDefault();
    if (isPlaying) return;
    
    updateMousePosition(event);
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(objects, true);
    
    if (intersects.length > 0 && intersects[0].object.userData.removable) {
        scene.remove(intersects[0].object);
        objects = objects.filter(obj => obj !== intersects[0].object);
    }
}

function updateMousePosition(event) {
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseMove(event) {
    // Could add hover effects here
}

function onWindowResize() {
    const canvas = document.getElementById('gameCanvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

// Camera controls
let cameraRotation = { x: 0, y: 0 };
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let keys = {};

function setupCameraControls() {
    const canvas = document.getElementById('gameCanvas');
    
    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle mouse or Shift+Left
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            cameraRotation.y += deltaX * 0.005;
            cameraRotation.x += deltaY * 0.005;
            cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.x));
            
            updateCameraPosition();
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });
    
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const distance = camera.position.length();
        const newDistance = Math.max(5, Math.min(50, distance + e.deltaY * zoomSpeed));
        camera.position.normalize().multiplyScalar(newDistance);
    });
}

function updateCameraPosition() {
    const distance = camera.position.length();
    camera.position.x = distance * Math.sin(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.position.y = distance * Math.sin(cameraRotation.x);
    camera.position.z = distance * Math.cos(cameraRotation.y) * Math.cos(cameraRotation.x);
    camera.lookAt(0, 0, 0);
}

function updateCamera() {
    const speed = 0.2;
    const direction = new THREE.Vector3();
    
    if (keys['w']) direction.z -= speed;
    if (keys['s']) direction.z += speed;
    if (keys['a']) direction.x -= speed;
    if (keys['d']) direction.x += speed;
    
    if (direction.length() > 0) {
        direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        camera.position.add(direction);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    if (!isPlaying) {
        updateCamera();
    } else if (playerController) {
        playerController.update();
    }
    
    renderer.render(scene, camera);
}

// UI Functions
function showHome() {
    document.getElementById('heroSection').style.display = 'block';
    document.getElementById('studioContainer').style.display = 'none';
    document.getElementById('gamesGrid').style.display = 'none';
}

function showStudio() {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('studioContainer').style.display = 'block';
    document.getElementById('gamesGrid').style.display = 'none';
    
    if (!scene) {
        setTimeout(() => initScene(), 100);
    }
}

function showGames() {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('studioContainer').style.display = 'none';
    document.getElementById('gamesGrid').style.display = 'grid';
}

function selectTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function selectColor(color) {
    currentColor = color;
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
    event.target.classList.add('active');
}

function updateSize(value) {
    currentSize = parseFloat(value);
    document.getElementById('sizeValue').textContent = value;
}

function clearScene() {
    if (confirm('Are you sure you want to delete all blocks?')) {
        objects.forEach(obj => {
            if (obj.userData.removable) {
                scene.remove(obj);
            }
        });
        objects = [];
    }
}

function saveGame() {
    const gameData = {
        name: prompt('Enter a name for your game:', 'My Awesome Game') || 'Untitled Game',
        blocks: objects.map(obj => ({
            type: obj.userData.type,
            color: obj.userData.color,
            size: obj.userData.size,
            position: {
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z
            }
        })),
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    const savedGames = JSON.parse(localStorage.getItem('blockverse_games') || '[]');
    savedGames.push(gameData);
    localStorage.setItem('blockverse_games', JSON.stringify(savedGames));
    
    // Download as JSON file
    const dataStr = JSON.stringify(gameData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${gameData.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    link.click();
    
    alert('✅ Game saved! Downloaded as JSON file.');
}

function loadGame(gameData) {
    clearScene();
    gameData.blocks.forEach(block => {
        createBlock(block.type, block.color, block.position, block.size);
    });
}

function playGame() {
    isPlaying = !isPlaying;
    const playButton = document.querySelector('.play-button');
    
    if (isPlaying) {
        playButton.textContent = '⏸️ Stop';
        playButton.style.background = 'linear-gradient(45deg, #ee5a6f 0%, #f29263 100%)';
        
        // Create simple player controller
        playerController = createPlayerController();
    } else {
        playButton.textContent = '▶️ Test Play';
        playButton.style.background = 'linear-gradient(45deg, #11998e 0%, #38ef7d 100%)';
        playerController = null;
        
        // Reset camera
        camera.position.set(10, 10, 10);
        camera.lookAt(0, 0, 0);
    }
}

function createPlayerController() {
    // Create a simple player character (sphere)
    const playerGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 2, 0);
    player.castShadow = true;
    scene.add(player);
    
    const velocity = new THREE.Vector3();
    const moveSpeed = 0.1;
    const jumpPower = 0.3;
    let isGrounded = false;
    
    return {
        update: function() {
            // Apply gravity
            velocity.y -= 0.01;
            
            // Movement
            const moveDirection = new THREE.Vector3();
            if (keys['w'] || keys['arrowup']) moveDirection.z -= moveSpeed;
            if (keys['s'] || keys['arrowdown']) moveDirection.z += moveSpeed;
            if (keys['a'] || keys['arrowleft']) moveDirection.x -= moveSpeed;
            if (keys['d'] || keys['arrowright']) moveDirection.x += moveSpeed;
            
            // Jump
            if (keys[' '] && isGrounded) {
                velocity.y = jumpPower;
                isGrounded = false;
            }
            
            player.position.add(moveDirection);
            player.position.add(velocity);
            
            // Ground collision
            if (player.position.y <= 0.5) {
                player.position.y = 0.5;
                velocity.y = 0;
                isGrounded = true;
            }
            
            // Camera follow
            camera.position.set(
                player.position.x + 10,
                player.position.y + 8,
                player.position.z + 10
            );
            camera.lookAt(player.position);
        },
        destroy: function() {
            scene.remove(player);
        }
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 BlockVerse loaded successfully!');
});
