const socket = io();

const timerElement = document.getElementById('timer');
const endGameElement = document.getElementById('endGame');
const finalScoreElement = document.getElementById('finalScore');
const finalScoreList = document.getElementById('finalScoreList');
const gameElement = document.getElementById('game');
const welcomeElement = document.getElementById('welcome');
const wordElement = document.getElementById('word');
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');
const guessInput = document.getElementById('guess');
const submitButton = document.getElementById('submit');
const correctSound = new Audio('correct-answer.mp3');
const incorrectSound = new Audio('incorrect-answer.mp3');
const success = new Audio('success.mp3');
const fondo = new Audio('fondo.mp3');

fondo.loop=true;
fondo.volume=0.2;

function playfondoMusic() {
    fondo.play();
}

function playCorrectSound() {
    correctSound.play();
}

socket.on('correctGuess', () => {
    playCorrectSound(); // Reproduce el sonido cuando se acierta una palabra
});

function playinCorrectSound() {
    incorrectSound.play();
}

socket.on('incorrectGuess', () => {
    playinCorrectSound(); // Reproduce el sonido cuando se no acierta una palabra
});

function playsuccessSound() {
    success.play();
}


socket.on('success', () => {
    playsuccessSound(); // Reproduce el sonido cuando se no acierta una palabra
});


const gameDuration = 50; // Duración del juego en segundos

let timerInterval;
let remainingTime = gameDuration;

socket.emit('joinRoom', 'room1'); // Reemplaza 'room1' con el ID de la sala real

// Evento que se dispara cuando el servidor emite un mensaje de bienvenida
socket.on('welcomeMessage', (message) => {
    console.log('Received welcome message:', message);
    welcomeElement.textContent = message;
    welcomeElement.classList.remove('hidden');
    gameElement.classList.add('hidden'); // Oculta el área del juego hasta que comience
    
});

// Evento que se dispara cuando el servidor emite el inicio del juego
socket.on('gameStart', () => {
    console.log('Game started');
    welcomeElement.classList.add('hidden'); // Oculta el mensaje de bienvenida
    gameElement.classList.remove('hidden'); // Muestra el área del juego
    startTimer(); // Inicia el temporizador
    playfondoMusic()

    // Solicita la palabra inicial después de que el juego comience
    socket.emit('requestWord');
});

// Evento que se dispara cuando el servidor emite la palabra actual
socket.on('updateWord', (word) => {
    console.log('Received word:', word);
    if (word) {
        wordElement.textContent = word[0] + ' ' + '_ '.repeat(word.length - 2) + word[word.length - 1];
    } else {
        wordElement.textContent = 'No more words available';
    }
});

// Evento que se dispara cuando el servidor emite la actualización de las puntuaciones
socket.on('updateScore', (scores) => {
    console.log('Scores updated:', scores);
    scoreElement.innerHTML = ''; // Limpia las puntuaciones existentes
    for (const userId in scores) {
        const score = scores[userId].score;
        const playerName = scores[userId].name;
        const scoreItem = document.createElement('p');
        scoreItem.textContent = `${playerName}: ${score}`;
        scoreElement.appendChild(scoreItem);
    }
});

// Evento que se dispara cuando el servidor emite el tiempo restante
socket.on('updateTime', (timeRemaining) => {
    console.log('Time remaining:', timeRemaining);
    timerElement.textContent = `Tiempo restante: ${timeRemaining}s`;
});

// Evento que se dispara cuando el servidor emite el fin del juego
socket.on('endGame', (scores) => {
    console.log('Game ended. Final scores:', scores);
    gameElement.classList.add('hidden'); // Oculta el área del juego
    endGameElement.classList.remove('hidden'); // Muestra el panel de resultados finales
    finalScoreElement.textContent = 'Fin del juego. Aquí están los resultados finales:';
    finalScoreList.innerHTML = ''; // Limpia las puntuaciones finales existentes
    for (const userId in scores) {
        const score = scores[userId].score;
        const playerName = scores[userId].name;
        const scoreItem = document.createElement('li');
        scoreItem.textContent = `${playerName}: ${score}`;
        finalScoreList.appendChild(scoreItem);
    }
});

// Evento que se dispara cuando el servidor emite un mensaje de reinicio
socket.on('restartGame', () => {
    messageElement.textContent = 'El juego ha sido reiniciado. Espera a que comience una nueva ronda.';
    location.reload(); // Opcional, para recargar la página y reiniciar el estado
});

socket.on('category', (category) => {
    console.log('Received category:', category);
    const categoryDisplayElement = document.getElementById('categoryDisplay');
    categoryDisplayElement.textContent = `Categoría: ${category}`;
});

// Función para enviar la suposición del jugador al servidor
function sendGuess() {
    const guess = guessInput.value.trim();
    if (guess) {
        socket.emit('guess', guess);
        guessInput.value = ''; // Limpia el campo de entrada después de enviar
    }
}

// Evento para el botón de envío de suposición
submitButton.addEventListener('click', sendGuess);
guessInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Previene el comportamiento predeterminado (como enviar un formulario)
        submitButton.click(); // Simula un clic en el botón de enviar
    }
});



submitButton.addEventListener('click', () => {
        const guess = guessInput.value.trim();
        if (guess !== '') {
            socket.emit('guess', guess);
            guessInput.value = ''; // Limpiar el campo de texto después de enviar
        }
    });

// Función para iniciar el temporizador del juego
function startTimer() {
    remainingTime = gameDuration;
    timerElement.textContent = `Tiempo restante: ${remainingTime}s`;
    timerInterval = setInterval(() => {
        remainingTime--;
        if (remainingTime <= 0) {
            clearInterval(timerInterval);
            socket.emit('requestFinalScore'); // Solicita puntuaciones finales al servidor
        } else {
            socket.emit('updateTime', remainingTime);
        }
    }, 1000); // Actualiza cada segundo
}

socket.emit('joinRoom', { room: roomName, category: selectedCategory });