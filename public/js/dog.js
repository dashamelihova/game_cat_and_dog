class Dog extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'dog');
        scene.add.existing(this);
        scene.physics.add.existing(this, Phaser.Physics.Arcade.DYNAMIC_BODY);

        this.setCircle(12,1,1);
        this.setDisplaySize(49, 50);
        this.speed = 100;
        this.lifespan = 10000;//время жизни
        this.isChasing = false;//указывающее, преследует ли “собака” игрока
        this.target = new Phaser.Math.Vector2();//для хранения целевой позиции “собаки”.
        this.alpha = 1;//Инициализирует прозрачность “собаки”
    }

    start() {
        this.isChasing = true; //“собака” начинает преследование.
        //Создает таймер, который вызовет анонимную функцию обратного вызова через this.lifespan
        this.scene.time.delayedCall(this.lifespan, () => {
            this.isChasing = false;//Останавливает преследование.
            this.destroy();//Уничтожает спрайт “собаки” со сцены.
        }, [], this);
        return this;
    }

    //time: Текущее время игры (в миллисекундах).
    //delta: Время, прошедшее с момента последнего кадра.
    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.isChasing && this.target) {
           this.rotation = this.scene.physics.moveToObject(this, this.target, this.speed) + 1.5707963267948966;
       }
    }

    stop() {
        this.isChasing = false;
        this.body.stop();// Останавливает движение физического тела “собаки”.
    }
}