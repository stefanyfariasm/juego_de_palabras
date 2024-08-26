const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const readline = require('readline'); // Para leer comandos desde la consola

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Nueva ruta para visualizar las torres
app.get('/visualization', (req, res) => {
    res.sendFile(__dirname + '/public/visualization.html');
});

// List of adjectives and nouns for player names
const adjectives = ['Radiante', 'Valiente', 'Feroz', 'Rápido', 'Sabio', 'Noble', 'Intrépido', 'Misterioso', 'Fuerte', 'Ágil'];
const nouns = ['Caballero', 'Dragón', 'Guerrero', 'Vaca', 'Rata', 'Héroe', 'Mago', 'Cazador', 'Príncipe', 'Explorador'];

// Expanded list of Spanish words for the game
const words = {
    animales: [
        'oso', 'pez', 'lobo', 'gato', 'pato', 
        'rata', 'vaca', 'loro', 
        'rana', 'perro', 'tigre', 'puma', 
        'lince', 'burro', 'vaca', 'pato', 'gato', 
        'leon', 'gacela', 'peces', 'hiena', 'llama', 
        'cebra', 'zorro', 'puma', 'cabra', 'nutria', 
        'coyote', 'cobra', 'tiburon', 'gacela', 'canguro', 
        'buitre', 'puma', 'gato', 'huron', 'cebra', 
        'gorila', 'pantera', 'delfin', 'tortuga',
        'chimpance', 'mariposa', 'serpiente'
    ],
    deportes: [
        'futbol', 'baloncesto', 'natacion', 'atletismo', 'voleibol', 
        'beisbol', 'ciclismo', 'boxeo', 'gimnasia', 'hockey', 
        'esgrima', 'rugby', 'surf', 'tenis', 'judo', 
        'karate', 'taekwondo', 'levantamiento de pesas', 'ajedrez', 'automovilismo', 
        'patinaje', 'remo', 'snowboarding', 'esqui', 'golf'
    ],
    acciones: [
        'correr', 'saltar', 'nadar', 'leer', 'escribir', 
        'cantar', 'bailar', 'cocinar', 'pintar', 'conducir', 
        'caminar', 'comprar', 'vender', 'lavar', 'limpiar', 
        'coser', 'tejer', 'cortar', 'construir', 'reparar', 
        'viajar', 'ensenar', 'estudiar', 'dormir', 'reir'
    ],
    utilesEscolares: [
        'lapiz', 'boligrafo', 'cuaderno', 'borrador', 'regla', 
        'compas', 'tijeras', 'sacapuntas', 'marcador', 'calculadora', 
        'mochila', 'tiza', 'cartulina', 'goma de borrar', 'pegamento', 
        'pincel', 'libro', 'libreta', 'carpeta', 'papel', 
        'diccionario', 'grapadora', 'estuche', 'pizarron', 'atlas'
    ]
};

function getRandomCategory() {
    const categories = ['animales', 'deportes', 'acciones', 'utilesEscolares']; // Lista de categorías disponibles
    const randomIndex = Math.floor(Math.random() * categories.length);
    return categories[randomIndex];
}


let usedWords = new Set(); // Para llevar un registro de las palabras ya usadas

function getNewWord(currentDifficulty, selectedCategory) {
    let wordLength = currentDifficulty + 3; // Longitud inicial de la palabra
    const maxWordLength = 7; // Longitud máxima permitida
    
    while (wordLength <= maxWordLength) {
        // Filtrar palabras en la categoría seleccionada por la longitud actual y que no hayan sido usadas
        const filteredWords = words[selectedCategory]
            .filter(word => word.length === wordLength && !usedWords.has(word));
        
        if (filteredWords.length > 0) {
            // Seleccionar una palabra al azar
            const index = Math.floor(Math.random() * filteredWords.length);
            const chosenWord = filteredWords[index];
            
            // Marcar la palabra como usada
            usedWords.add(chosenWord);
            
            return chosenWord;
        } else {
            // Aumentar la longitud de la palabra si no se encuentran palabras disponibles
            wordLength++;
        }
    }

    // Si no se encuentran palabras después de aumentar a la longitud máxima, retornar la primera palabra disponible
    const allWords = words[selectedCategory]
        .filter(word => word.length <= maxWordLength && !usedWords.has(word));
    
    if (allWords.length > 0) {
        const index = Math.floor(Math.random() * allWords.length);
        const chosenWord = allWords[index];
        
        // Marcar la palabra como usada
        usedWords.add(chosenWord);
        
        return chosenWord;
    }

    // Retorno por defecto (en caso de que algo inesperado ocurra)
    return "No valid word found"; // o cualquier otro comportamiento de respaldo
}


// Function to generate a random name
function generatePlayerName() {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adjective} ${noun}`;
}

const rooms = {}; // Object to keep track of rooms and scores
let gameStarted = false; // Flag to check if the game has started

io.on('connection', (socket) => {
    let Cat = getRandomCategory();
    console.log('A user connected:', socket.id);

    // Generate a unique player name
    const playerName = generatePlayerName();
    console.log(`${socket.id} assigned name: ${playerName}`);

    socket.on('startCommand', () => {
        for (const roomId in rooms) {
            startGame(roomId);
        }
    });

    socket.on('restartCommand', () => {
        restartGame();
    });

    // Join a room
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} joined room ${roomId}`);
        

        if (!rooms[roomId]) {
            rooms[roomId] = { scores: {}, players: {}, difficulty: 0, category: Cat, gameStartTime: null, timerInterval: null };
            console.log(`Room ${roomId} created.`);
        }

        console.log(`La categoría seleccionada es: ${rooms[roomId].category}`);
        let userId = socket.id;
        rooms[roomId].scores[userId] = { score: 0, name: playerName };
        rooms[roomId].players[userId] = { word: getNewWord(rooms[roomId].difficulty, rooms[roomId].category) };
        socket.emit('category', rooms[roomId].category);

        // Emit welcome message and current word to the newly joined user
        if (!gameStarted) {
            //socket.emit('welcomeMessage', 'Bienvenido al juego de palabras, por favor espera a que comience el juego');
        } else {
            socket.emit('updateWord', rooms[roomId].players[userId].word);
        }
        socket.emit('updateScore', rooms[roomId].scores);
        console.log(`Current word for ${socket.id} in room ${roomId}: ${rooms[roomId].players[userId].word}`);
        console.log(`Scores for room ${roomId}:`, rooms[roomId].scores);

        // Broadcast to other users in the room
        io.to(roomId).emit('updateScore', rooms[roomId].scores);

        // Handle guess submissions
        socket.on('guess', (guess) => {
            console.log(`${socket.id} guessed: ${guess}`);
            const playerData = rooms[roomId].players[socket.id];
            if (words[rooms[roomId].category].includes(guess) && guess === playerData.word) {
                io.emit('correctGuess');
                rooms[roomId].scores[socket.id].score++;
                rooms[roomId].difficulty++;
                playerData.word = getNewWord(rooms[roomId].difficulty, rooms[roomId].category);
                console.log(`Correct guess by ${socket.id}. New word: ${playerData.word}`);
                if (playerData.word) {
                    socket.emit('updateWord', playerData.word);
                    
                } else {
                    socket.emit('updateWord', 'No more words available');
                }

                // Update all clients in the room with the latest scores
                io.to(roomId).emit('updateScore', rooms[roomId].scores);

                // Emit score updates to all clients connected to the visualization page
                io.emit('updateScore', rooms[roomId].scores);
                console.log(`Updated scores for room ${roomId}:`, rooms[roomId].scores);
            } else {
                io.emit('incorrectGuess');
                console.log(`Incorrect guess by ${socket.id}.`);
                socket.emit('updateWord', playerData.word);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            delete rooms[roomId].scores[socket.id]; // Clean up the score when a user disconnects
            delete rooms[roomId].players[socket.id]; // Clean up the player data when a user disconnects
            io.to(roomId).emit('updateScore', rooms[roomId].scores); // Update scores for remaining users
            console.log(`Scores for room ${roomId} after ${socket.id} disconnected:`, rooms[roomId].scores);
        });

        socket.on('requestFinalScore', () => {
            socket.emit('endGame', rooms[roomId].scores); // Send final scores to the requesting client
            console.log(`Final scores for room ${roomId}:`, rooms[roomId].scores);
        });

        // Handle request for the current word
        socket.on('requestWord', () => {
            const playerData = rooms[roomId].players[socket.id];
            socket.emit('updateWord', playerData.word);
        });
    });
});

function startGame(roomId) {
    if (gameStarted) return; // Prevent starting the game multiple times
    gameStarted = true;
    io.to(roomId).emit('gameStart');
    console.log(`Game started in room ${roomId}`);

    // Set up the game timer and notify clients
    rooms[roomId].gameStartTime = Date.now();
    rooms[roomId].timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - rooms[roomId].gameStartTime) / 1000);
        const timeRemaining = 50 - elapsed;
        if (timeRemaining <= 0) {
            clearInterval(rooms[roomId].timerInterval);
            io.to(roomId).emit('endGame', rooms[roomId].scores); // Notify all clients that the game has ended
            io.emit('success');
            console.log(`Game ended in room ${roomId}. Final scores:`, rooms[roomId].scores);
            gameStarted = false; // Allow the game to be started again
        } else {
            io.to(roomId).emit('updateTime', timeRemaining);
        }
    }, 1000); // Update every second
}

function restartGame() {
    for (const roomId in rooms) {
        // Clear the timer if it exists
        if (rooms[roomId].timerInterval) {
            clearInterval(rooms[roomId].timerInterval);
        }

        // Reset game state for each room
        rooms[roomId].scores = {};
        rooms[roomId].players = {};
        rooms[roomId].difficulty = 0;

        // Reset the usedWords set
        usedWords.clear();

        // Select a new category for the room
        rooms[roomId].category = getRandomCategory();

        // Inform clients that the game has been restarted
        io.to(roomId).emit('restartGame');
        console.log(`Game restarted in room ${roomId}`);
    }

    // Reset gameStarted flag to allow starting a new game
    gameStarted = false;
}

// Command line interface to start or restart the game
rl.on('line', (input) => {
    if (input === 'start') {
        for (const roomId in rooms) {
            startGame(roomId);
        }
    } else if (input === 'restart') {
        restartGame();
    } else {
        console.log('Unknown command:', input);
    }
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
