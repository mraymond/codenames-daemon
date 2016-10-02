var io = require('socket.io').listen(4454);
var currGames = {};
var words = require("./words");
var socketToUser = {};
var currUsers = [];

var game = {
    startGame: function(gameID) {
        console.log("Starting game");
    },
    endGame: function(gameID) {
        var playersLeft = currGames[gameID.toLowerCase()].inGame.length;
        currGames[gameID.toLowerCase()].startCount = 0;
        if(playersLeft == 1) {
            io.sockets.in(gameID.toLowerCase()).emit('PLAYERWIN', currGames[gameID.toLowerCase()].inGame[0]);
            currGames[gameID.toLowerCase()].pData[currGames[gameID.toLowerCase()].inGame[0]].wins += 1;
            currGames[gameID.toLowerCase()].lastWinner = currGames[gameID.toLowerCase()].inGame[0];
            this.cleanUp(gameID);
            return;
        }
        var currWinner = "";
        for(var i = 0;i<playersLeft;i++) {
            if(currWinner == "") {
                currWinner = currGames[gameID.toLowerCase()].inGame[i];
                continue;
            }
            var winnerCard = currGames[gameID.toLowerCase()].pData[currWinner].cards[0];
            var cCheck = currGames[gameID.toLowerCase()].pData[currGames[gameID.toLowerCase()].inGame[i]].cards[0]
            if(cards[cCheck].value > cards[winnerCard].value) {
                currWinner = currGames[gameID.toLowerCase()].inGame[i];
            } else if(cards[cCheck].value == cards[winnerCard].value) {
                var dWinnerCount = 0;
                var dNewCount = 0;
                for(var i = 0, l = currGames[gameID.toLowerCase()].pData[currWinner].discard.length;i<l;++i) {
                    dWinnerCount += cards[currGames[gameID.toLowerCase()].pData[currWinner].discard[i]].value;
                }
                for(var i = 0, l = currGames[gameID.toLowerCase()].pData[currGames[gameID.toLowerCase()].inGame[i]].discard.length;i<l;++i) {
                    dWinnerCount += cards[currGames[gameID.toLowerCase()].pData[currGames[gameID.toLowerCase()].inGame[i]].discard[i]].value;
                }
                // Evalulate the discard piles
            }
        }
        this.cleanUp(gameID);
        currGames[gameID.toLowerCase()].pData[currWinner].wins += 1;
        currGames[gameID.toLowerCase()].lastWinner = currWinner;
        io.sockets.in(gameID.toLowerCase()).emit('PLAYERWIN', currWinner);
    },
    cleanUp: function(gameID) {
        var pCount = currGames[gameID.toLowerCase()].players.length;
        for(var i = 0;i<pCount;i++) {
            currGames[gameID.toLowerCase()].pData[currGames[gameID.toLowerCase()].players[i]].cards = [];
            currGames[gameID.toLowerCase()].pData[currGames[gameID.toLowerCase()].players[i]].discard = [];
            currGames[gameID.toLowerCase()].pData[currGames[gameID.toLowerCase()].players[i]].effects = {};
        }
    },
}
function genID() {
    var ID = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var pLen = possible.length;
    while(true) {
        for( var i=0; i < 5; i++ )
            ID += possible.charAt(Math.floor(Math.random() * pLen));
        if(currGames.ID === undefined) break;
    }
    return ID;
}

function rollDice(sides){
    var sides = sides || 6;
    return Math.floor(sides*Math.random())+1;   
}

function generateBoard(firstPlayer, list) {
    list = list || "all";
    var word, board = [], boardLen = 25;
    for(var i = 0; i < boardLen; i++) {
        while(true) {
            word = words.lists[list][Math.floor(Math.random()*words.lists[list].length)];
            if(findWord(word, board)) continue;
            board.push({
                word: word,
                type: "civilian",
                status: "hidden"
            });
            break;
        }
    }
    var takenWords = [], idx, secondPlayer;
    // Choose the assassin
    idx = Math.floor(Math.random()*boardLen);
    takenWords.push(idx);
    board[idx].type = "assassin";
    if(firstPlayer == "red") {
        secondPlayer = "blue";
    } else {
        secondPlayer = "red";
    }
    // Set statuses for first player
    for(var i = 0; i < 9; i++) {
        while(true) {
            idx = Math.floor(Math.random()*boardLen);
            if(takenWords.indexOf(idx) !== -1) continue;
            takenWords.push(idx);
            board[idx].type = firstPlayer;
            break;
        }
    }

    // Set statuses for second player
    for(var i = 0; i < 8; i++) {
        while(true) {
            idx = Math.floor(Math.random()*boardLen);
            if(takenWords.indexOf(idx) !== -1) continue;
            takenWords.push(idx);
            board[idx].type = secondPlayer;
            break;
        }
    }

    return board;
}

function findWord(needle, haystack) {
    for(var i = 0; i < haystack.length; i++) {
        if(haystack[i].word == needle) {
            return true;
        }
    }
    return false;
}

io.sockets.on('connection', function(socket){
    socket.on('disconnect', function() {
        if(socketToUser[socket.id] == undefined) return; // They never fully connected
        var room = socket.room;
        io.sockets.in(room).emit('GAMEOVER', {leaver: socketToUser[socket.id].name}); // Alert clients
        if(currGames[room.toLowerCase()] != undefined) { // Room was already deleted
            if(currGames[room.toLowerCase()].status == 1) delete currGames[room.toLowerCase()]; // Remove game if it's started already
            else {
                // Remove player data
                currGames[room.toLowerCase()].players.splice(currGames[room.toLowerCase()].players.indexOf(socketToUser[socket.id].name),1);
                delete currGames[room.toLowerCase()].pData[socketToUser[socket.id].name];
            }
        }
        currUsers.splice(currUsers.indexOf(socketToUser[socket.id].name),1); // Remove them from the online users
    });
    socket.on('USER', function(data) {
        if(currUsers.indexOf(data.name) !== -1) {
            socket.emit('NAMETAKEN');
            return;
        }
        console.log("got name: "+data.name)
        currUsers.push(data.name);
        socketToUser[socket.id] = {
            name: data.name
        };
        socket.name = data.name;
        socket.emit('WELCOME');
    });

    socket.on('INIT', function(data) {
        socket.emit('INIT', words.wordLists);
    });

    socket.on('PICKCARD', function(data) {
        io.sockets.in(socket.room).emit('PICKCARD', data);
    });

    socket.on('CREATEGAME', function(data) {
        var gameID = genID();
        var first = "red";
        if(rollDice(2) == 1) {
            first = "blue";
        }
        currGames[gameID.toLowerCase()] = {
            started: Date.now(),
            active: Date.now(),
            startCount: 0,
            status: 0,
            players: [],
            pData: {},
            loadReady: 0,
            host: socket.id,
            board: [],
            firstPlayer: first,
            words: data.list
        };
        currGames[gameID.toLowerCase()].board = generateBoard(first, data.list);
        var name = socket.id;
        console.log("Creating game for: "+name);
        // Not adding the host to the player list for now
        /*currGames[gameID.toLowerCase()].players.push(name);
        currGames[gameID.toLowerCase()].pData[name] = {
            socket: socket.id,
            status: 1,
            wins: 0,
        };*/
        socket.room = gameID.toLowerCase()
        socket.join(gameID.toLowerCase());
        socket.emit('JOINGAME',{gameID: gameID, board: currGames[gameID.toLowerCase()].board, firstPlayer: first});
    });
    socket.on('JOINGAME', function(data) {
        if(data.gameID == undefined) return;
        var gameID = data.gameID.toLowerCase();
        if(currGames[gameID] === undefined) {
            socket.emit("INVALIDGAME");
            return;
        }
        if(currGames[gameID].players.length > 3) {
            socket.emit("FULLGAME");
            return;
        }
        var name = socket.name;
        currGames[gameID].active = Date.now();
        socket.room = gameID;
        socket.join(gameID);
        socket.broadcast.to(gameID).emit('JOINGAME',{user: name})
        socket.emit('JOINGAME',{gameID: gameID, board: currGames[gameID].board, firstPlayer: currGames[gameID].firstPlayer});
        currGames[gameID].players.push(name);
        currGames[gameID].pData[name] = {
            socket: socket.id,
            status: 1,
            wins: 0,
        };
    });
    socket.on("RESTART", function(data) {
        currGames[socket.room].paused = false;
        io.sockets.in(socket.room).emit('RESTART', socket.name);
    });
    socket.on('STARTGAME', function(data) {
        var room = socket.room;
        currGames[room].paused = false;
        var cCount = io.sockets.adapter.rooms[room].length;
        if(cCount < 2) {
            socket.emit("NOTENOUGH");
            return;
        }
        if(currGames[room].host == socket.id) {
            currGames[room].status = 1;
            currGames[room].inGame = currGames[room].players.slice(0);
            io.sockets.in(room).emit('STARTGAME', {users: currGames[room].players});
        }
    });
    socket.on('LOADREADY', function() {
        var room = socket.room;
        var cCount = io.sockets.adapter.rooms[room].length;
        currGames[room].loadReady++;
        if(cCount == currGames[room].loadReady) {
            game.startGame(room);
        }
    })
    socket.on('STOPGAME', function(data) {
        var room = socket.room;
        currGames.startCount--;
    });
    socket.on('PLAYAGAIN', function(data) {
        var room = socket.room;
        var cCount = io.sockets.adapter.rooms[room].length;
        currGames[room].startCount++;
        if(currGames[room].startCount == cCount) {
            currGames[room].inGame = currGames[room].players.slice(0);
            io.sockets.in(room).emit('PLAYAGAIN');
            game.startGame(room);
        }
    });
});