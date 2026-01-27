export class Cartridge {
  /** リセット処理 */
  static onReset({ pads, speakers, screens }) {
    this.pads = pads;
    this.speakers = speakers;
    this.screens = screens;

    // 画面設定 (40x30 超低解像度)
    this.screens[0].setViewBox(0, 0, 40, 30);

    // 定数
    this.GRAVITY = 0.15;
    this.JUMP_POWER = -1.8;
    this.MOVE_SPEED = 0.5;
    this.GROUND_Y = 25;

    // マリオ風プレイヤースプライト (3x4)
    this.player = this.screens[0].addSprite([
      [0, 1, 0],
      [0, 2, 0],
      [0, 3, 0],
      [0, 3, 0],
    ], { colorIds: [null, 1, 2, 4] }); // 赤帽子、肌色、青服

    // 地面スプライト
    this.ground = this.screens[0].addSprite(
      Array(2).fill(Array(40).fill(5)),
      { colorIds: [null, null, null, null, null, 6], x: 0, y: this.GROUND_Y + 4 }
    );

    // 敵リスト
    this.enemies = [];

    this.restart();
  }

  /** クリボー風の敵を生成 */
  static spawnEnemy() {
    const side = Math.random() < 0.5 ? 0 : 37;
    const enemy = this.screens[0].addSprite([
      [1, 1, 1],
      [0, 1, 0],
    ], { colorIds: [null, 8], x: side, y: this.GROUND_Y + 1 });
    enemy.vx = side === 0 ? 0.3 : -0.3;
    enemy.alive = true;
    this.enemies.push(enemy);
  }

  /** リスタート */
  static restart() {
    this.isGameover = false;
    this.score = 0;
    this.spawnTimer = 0;

    // プレイヤー初期位置
    this.player.x = 18;
    this.player.y = this.GROUND_Y;
    this.player.vy = 0;
    this.player.onGround = true;

    // 敵をクリア
    this.enemies.forEach(e => e.remove());
    this.enemies = [];

    // 最初の敵を生成
    this.spawnEnemy();

    this.result?.remove();
  }

  /** ゲームオーバー */
  static gameover() {
    this.isGameover = true;
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 12, duration: 8 },
        { noteNumber: 10, duration: 8 },
        { noteNumber: 7, duration: 8 },
        { noteNumber: 4, duration: 8 },
        { noteNumber: 0, duration: 8 },
      ],
    ]);
    this.result = this.screens[0].addText(this.score, {
      y: 12,
      x: 20 - this.score.toString().length * 4,
    });
  }

  /** 踏みつけ効果音 */
  static playStompSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 12, duration: 2 },
        { noteNumber: 16, duration: 2 },
        { noteNumber: 19, duration: 4 },
      ],
    ]);
  }

  /** ジャンプ効果音 */
  static playJumpSound() {
    this.sfx?.stop();
    this.sfx = this.speakers[0].play([
      [
        { noteNumber: 7, duration: 2 },
        { noteNumber: 12, duration: 2 },
      ],
    ]);
  }

  /** フレーム処理 */
  static onFrame() {
    if (!this.isGameover) {
      const pad = this.pads[0].buttons;

      // 左右移動
      if (pad.left.pressed && this.player.x > 0) {
        this.player.x -= this.MOVE_SPEED;
      }
      if (pad.right.pressed && this.player.x < 37) {
        this.player.x += this.MOVE_SPEED;
      }

      // ジャンプ
      if (pad.b0.justPressed && this.player.onGround) {
        this.player.vy = this.JUMP_POWER;
        this.player.onGround = false;
        this.playJumpSound();
      }

      // 重力
      this.player.vy += this.GRAVITY;
      this.player.y += this.player.vy;

      // 地面判定
      if (this.player.y >= this.GROUND_Y) {
        this.player.y = this.GROUND_Y;
        this.player.vy = 0;
        this.player.onGround = true;
      }

      // 敵の移動と衝突判定
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (!enemy.alive) continue;

        // 敵の移動
        enemy.x += enemy.vx;

        // 画面端で折り返し
        if (enemy.x <= 0 || enemy.x >= 37) {
          enemy.vx *= -1;
        }

        // プレイヤーとの衝突判定
        const dx = Math.abs(this.player.x - enemy.x);
        const dy = this.player.y - enemy.y;

        if (dx < 3) {
          // 上から踏みつけ（落下中かつ敵より上にいる）
          if (this.player.vy > 0 && dy < -1 && dy > -5) {
            enemy.alive = false;
            enemy.remove();
            this.enemies.splice(i, 1);
            this.score++;
            this.player.vy = this.JUMP_POWER * 0.7; // 小ジャンプ
            this.playStompSound();
          }
          // 横から当たる
          else if (Math.abs(dy) < 2) {
            this.gameover();
            return;
          }
        }
      }

      // 敵の生成（一定間隔で）
      this.spawnTimer++;
      if (this.spawnTimer > 120 && this.enemies.length < 5) {
        this.spawnEnemy();
        this.spawnTimer = 0;
      }
    } else {
      if (this.pads[0].buttons.b1.justPressed && this.sfx.ended) {
        this.restart();
      }
    }
  }
}
