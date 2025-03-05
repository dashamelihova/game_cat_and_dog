var config = {
    type: Phaser.AUTO,
    parent: 'phaser-example',
    width: 800,
    height: 800,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// Создаем новый экземпляр игры Phaser
var game = new Phaser.Game(config);
var dogs = [];

// Функция для загрузки ресурсов игры
function preload() {
    this.load.image('cat_player', 'assets/cat_player.png');
    this.load.image('cat_other_player', 'assets/cat_other_player.png');
    this.load.image('background', 'assets/background.png');
    this.load.image('star', 'assets/star_gold.png');
    this.load.image('dog', 'assets/dog.png');
}

// Функция для создания игровых объектов
function create() {
    var self = this;  // Сохраняем ссылку на контекст сцены (this)
    this.socket = io();// Подключаемся к серверу через Socket.IO
    this.dogs = [];
    this.background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    this.background.setDepth(-1);
	
	// Создаем группу для других игроков
    this.otherPlayers = this.physics.add.group();

    this.playerScoreText = createScoreText(this);
	
	//получение информации обо всех игроках
    this.socket.on('currentPlayers', function (players) {
		// Удаляем старых других игроков
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            otherPlayer.scoreText.destroy();
            otherPlayer.destroy();
        });
        self.otherPlayers.clear();
		// Удаляем старых собак
         self.dogs.forEach(dog=>dog.destroy());
         self.dogs = [];
		 // Создаем новых игроков
        Object.keys(players).forEach(function (id) { // Если это текущий игрок
            if (players[id].playerId === self.socket.id) {// Добавляем текущего игрока
                addPlayer(self, players[id]);
            } else { // Если это другой игрок
                addOtherPlayers(self, players[id]); // Добавляем другого игрока
            }
        });
    });

	 this.socket.on('playerDisconnect', function (playerId) {
		 // Удаляем отключившегося игрока
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.scoreText.destroy();
                otherPlayer.destroy();
            }
        });
    });
	
    this.socket.on('newPlayer', function (playerInfo) {
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('playerMoved', function (playerInfo) {
		// Обновляем позицию и поворот другого игрока
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setRotation(playerInfo.rotation);
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                otherPlayer.scoreText.setPosition(playerInfo.x, playerInfo.y - 20);
            }
        });
    });
	
	//обновление счета
    this.socket.on('scoreUpdate', (playerId, score) => {
        updateScoreText(self, playerId, score, self.playerScoreText, self.otherPlayers);
    });
	
	//получение координат звезд
    this.socket.on('starLocation', function (stars) {
        if (self.stars) {// Если звезды существуют, уничтожаем их
            self.stars.forEach(star => star.destroy());
        }
        self.stars = [];// Очищаем массив звезд
		// Создаем новые звезды
        stars.forEach(starLocation => {
            const star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
			// Добавляем обработчик столкновения игрока со звездой
           self.physics.add.overlap(self.cat_player, star, function (player, collectedStar) {
                 collectedStar.destroy(); // Удаляем собранную звезду
                self.socket.emit('starCollected');// Сообщаем серверу о сборе звезды
            }, null, self);
            self.stars.push(star)// Добавляем звезду в массив
        });
    });
	
    this.socket.on('newDog', function(dogInfo) {
        createDog(self,dogInfo);// Создаем новую собаку
    });
	 
	 //обновление цели собаки
	this.socket.on('dogTargetUpdate', (dogId, target) => {
       self.dogs.forEach(dog => {// Обновляем цель конкретной собаки
            if (dog.dogId === dogId) {
                dog.target = target;
            }
      });
    });	
	
    this.socket.on('destroyDog', function(dogId) {
        destroyDog(self,dogId);
    })
	
}

// Функция для обновления состояния игры каждый кадр
function update() {
    var self = this;
    if (this.cat_player) {// Если текущий игрок существует
	// Проверяем, достиг ли игрок своей цели (с небольшим допуском)
         if (Phaser.Math.Distance.Between(this.cat_player.x, this.cat_player.y, this.cat_player.target.x, this.cat_player.target.y) < 6)
        {
            this.cat_player.body.reset(this.cat_player.target.x, this.cat_player.target.y); // Обновляем позицию игрока
        }
        var x = this.cat_player.x;
        var y = this.cat_player.y;
        var r = this.cat_player.rotation;
		// Проверяем, изменилась ли позиция или поворот
        if (this.cat_player.oldPosition && (x !== this.cat_player.oldPosition.x || y !== this.cat_player.oldPosition.y || r !== this.cat_player.oldPosition.rotation)) {
            // Сообщаем серверу о перемещении игрока
			this.socket.emit('playerMovement', { x: this.cat_player.x, y: this.cat_player.y, rotation: this.cat_player.rotation });
        }
		// Сохраняем текущую позицию и поворот игрока
        this.cat_player.oldPosition = {
            x: this.cat_player.x,
            y: this.cat_player.y,
            rotation: this.cat_player.rotation
        };
    }
	// Если есть собаки и текущий игрок
       if (this.dogs && this.cat_player && this.dogs.length > 0) {
		   // Обрабатываем столкновение игрока с собаками
           this.physics.overlap(this.cat_player, this.dogs, dogHitPlayer, null, this);
    }
}

// Функция для создания спрайта текущего игрока
function addPlayer(self, playerInfo) {
    self.cat_player = new Player(self, playerInfo.x, playerInfo.y, 'cat_player');
    self.cat_player.setDisplaySize(48, 50);
    self.cat_player.start();
    self.cat_player.playerId = playerInfo.playerId;
}

// Функция для создания спрайта другого игрока
function addOtherPlayers(self, playerInfo) {
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'cat_other_player')
        .setOrigin(0.5, 0.5)
        .setDisplaySize(48, 50);
    otherPlayer.playerId = playerInfo.playerId;
    otherPlayer.score = playerInfo.score;

    otherPlayer.scoreText = self.add.text(playerInfo.x, playerInfo.y - 20, `Счет: ${playerInfo.score}`, { fontSize: '16px', color: '#000000' });
    otherPlayer.scoreText.setScrollFactor(0);
    otherPlayer.scoreText.setDepth(1);
    otherPlayer.scoreText.setVisible(false);
    self.otherPlayers.add(otherPlayer);
}

// Функция для создания собаки
function createDog(scene, dogInfo) {
    const dog = new Dog(scene, dogInfo.x, dogInfo.y); // Создаем экземпляр собаки
    dog.dogId = dogInfo.dogId;// Устанавливаем ID собаки
    scene.physics.add.existing(dog, Phaser.Physics.Arcade.DYNAMIC_BODY);// Добавляем физическое тело
    dog.start();// Запускаем собаку
    scene.dogs.push(dog);// Добавляем собаку в массив
}

function destroyDog(scene,dogId){
       scene.dogs.forEach(dog=>{
              if(dog.dogId === dogId){
                  dog.destroy();
              }
            })
}

function dogHitPlayer(player, dog) {
    var self = this;
   if (player.isAlive) {
	     // Сообщаем серверу о столкновении
      self.socket.emit('dogHitPlayer', self.cat_player.playerId);
	  // Сообщаем серверу об удалении собаки
      self.socket.emit('destroyDog', dog.dogId);
   }
}

// Функция для создания текста счета
function createScoreText(scene) {
  const playerScoreText = scene.add.text(16, 16, '', { fontSize: '32px', fill: '#000000' });
  playerScoreText.setScrollFactor(0);
  return playerScoreText;
}

// Функция для обновления текста счета
function updateScoreText(scene, playerId, score, playerScoreText, otherPlayers) {
    if (playerId === scene.cat_player.playerId) {// Обновляем текст счета текущего игрока
          playerScoreText.setText(`Счет: ${score}`);
        } else {// Обновляем текст счета других игроков
          otherPlayers.getChildren().forEach(otherPlayer => {
            if (otherPlayer.playerId === playerId) {
              otherPlayer.score = score;
              otherPlayer.scoreText.setText(`Счет: ${score}`);
            }
          });
        }
}