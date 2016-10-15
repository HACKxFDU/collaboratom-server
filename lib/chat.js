var socket = require('socket.io');
var UserManager = require('./user-manager');
var userManager = new UserManager();

var RoomManager = require('./room-manager');
var roomManager = new RoomManager();

exports.listen = function(server){
    io = socket.listen(server);
    io.sockets.on('connection', function(socket){
        console.log("Connected");
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
    });
}
