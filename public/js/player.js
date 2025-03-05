class Player extends Phaser.Physics.Arcade.Sprite { ///Наследует от базового класса для спрайтов с физикой
    //Конструктор класса, инициализирует свойства объекта.
	constructor(scene, x, y, texture) {
        super(scene, x, y, texture);// Это создает базовый спрайт с физическим телом.
        scene.add.existing(this);//Добавляет спрайт (текущий экземпляр this) на сцену для отображения.
        scene.physics.add.existing(this);//Добавляет физическое тело для спрайта, чтобы можно было использовать физику Arcade

        this.setCircle(12, 0, 1); //Настраивает физическое тело спрайта на форму окружности
        this.setCollideWorldBounds(true);//Устанавливает свойство, чтобы спрайт не выходил за границы мира

        this.speed = 280;//Инициализирует скорость игрока
        this.target = new Phaser.Math.Vector2();//Создает новый вектор target для хранения целевой позиции игрока.
        this.isAlive = true;
        this.score = 0;
    }
	
	// Это метод, который запускает обработку ввода игрока
    start() {
		//Устанавливает слушателя на событие перемещения указателя (мыши или касания) на сцене.
        this.scene.input.on('pointermove', (pointer) => {
            if (this.isAlive) {
                this.target.x = pointer.x;
                this.target.y = pointer.y;
				//Управляет поворотом корабля и направлением его движения к целевой позиции
                this.rotation = this.scene.physics.moveToObject(this, this.target, this.speed) + 1.5707963267948966;
            }
        });
    }
	
	//Метод для “убийства” игрока
    kill() {
        this.isAlive = false;
        this.body.stop();//Останавливает движение физического тела игрока.
    }
	
	//Метод для обновления состояния игрока каждый кадр
    preUpdate() {
        super.preUpdate();//Вызывает метод preUpdate() родительского класса.
        if (this.body.speed > 0 && this.isAlive) {// Проверяет, движется ли игрок и жив ли он
            if (Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y) < 6) {// Проверяет, достиг ли игрок целевой позиции с некоторым допуском
                this.body.reset(this.target.x, this.target.y);//Перемещает игрока в целевую позицию.
            }
        }
    }
}