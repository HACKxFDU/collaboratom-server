var socket = require('socket.io');
var UserManager = require('./user-manager');
var userManager = new UserManager();

var RoomManager = require('./room-manager');
var roomManager = new RoomManager();

exports.listen = function(server){
    io = socket.listen(server);
    io.sockets.on('connection', function(socket){
        console.log("Connected");
        // console.log(socket.handshake)
        io.sockets.emit('atom:online', userManager.getOnlineCount());

        socket.on('atom:user', function(username, cb){
          var newUser = userManager.add(username, socket);
          console.log("New User:", newUser.id, newUser.username);
          roomManager.addToRoom(0, newUser);
          io.sockets.emit('atom:online', userManager.getOnlineCount());
          cb(newUser.id);
        })

        socket.on('atom:message', function(data) {
          console.log("New Message:" ,data);
          console.log(roomManager.getRooms());
          io.sockets.emit('atom:message',data);
        })

        socket.on('atom:username', function(username){
          console.log("Username changed to", username);
          userManager.changeUsername(username, socket);
        })

        socket.on('atom:rooms', function(cb){
          var rooms = roomManager.getRooms();
          cb(rooms);
        })

        socket.on('atom:rooms:create', function(name, cb) {
          var user = userManager.getUser(socket);
          if (user != undefined) {
            var newRoom = roomManager.add(name, user);
            roomManager.leaveFromRoom(user.currentRoom, user);
            roomManager.addToRoom(newRoom.id, user);
            cb(newRoom.id);
            console.log(user.username, "created", "Room:", name);
          }
        })

        socket.on('atom:rooms:join', function(id){
          var user = userManager.getUser(socket);
          if (user != undefined) {
            var prevRoom = user.currentRoom;
            if (prevRoom == id)
              return;
            roomManager.leaveFromRoom(prevRoom, user);
            roomManager.addToRoom(id, user);
            console.log(user.username, "joined", "Room:", id);
          }
        })

        socket.on('disconnect', function(){
          console.log("Disconnected");
          var user = userManager.getUser(socket);

          if (user != undefined) {
            roomManager.leaveFromRoom(user.currentRoom, user);
          }

          userManager.remove(socket);

          io.sockets.emit('atom:online', userManager.getOnlineCount());

          roomManager.rooms.forEach(function(room) {
            console.log("Room", room.name, ": ",
              room.people.map(function(person) {
                return person.username;
              })
            );
          });
        })

        socket.on('session', (data, cb) => {
            var newUser = userManager.add(data.username, socket);
            console.log("New User:", newUser.id, newUser.username);
            var newRoom = roomManager.add(data.session);
            console.log(data.text);
            newRoom.text = data.text;
            roomManager.addToRoom(newRoom.id, newUser);
            var numberAndText = {'number': userManager.getOnlineCount(), 'text': newRoom.text};
            io.sockets.emit('clientNumber', numberAndText); // FIXME
            cb(newRoom.id);
        });

        socket.on('sendChange', (user) => {
          console.log(user);
            socket.in(user.roomId).emit('receiveChange', user);
        })

        socket.on('join', (data, cb) => {
            var newUser = userManager.add(data.username, socket);
            var rooms = roomManager.getRooms();
            var room;
            console.log(data);
            console.log(rooms);
            for (var i = 0; i < rooms.length; i++) {
              if (rooms[i].name === data.session) {
                room = rooms[i];
                break;
              }
            }
            room.addUser(newUser);
            console.log(room.text);
            var numberAndText = {'number': userManager.getOnlineCount(), 'text': room.text};
            io.sockets.emit('clientNumber', numberAndText); // FIXME
            cb(room.id);
        })

    });
}
