function createScoreText(scene) {
  // Создает новый текстовый объект.
  const playerScoreText = scene.add.text(16, 16, '', { fontSize: '32px', fill: '#000000' });
  playerScoreText.setScrollFactor(0);//Это значит, что текст будет оставаться на месте при движении камеры.
  return playerScoreText;
}

function updateScoreText(scene, playerId, score, playerScoreText, otherPlayers) {
    if (playerId === scene.cat_player.playerId) {// Проверяет, соответствует ли переданный идентификатор игрока идентификатору текущего игрока 
          playerScoreText.setText(`Счет: ${score}`);//обновляет текст счета для текущего игрока.
        } else {
          // Проходит по всем спрайтам, которые находятся в группе 
          otherPlayers.getChildren().forEach(otherPlayer => {
            if (otherPlayer.playerId === playerId) {
              otherPlayer.score = score;//Обновляет счёт спрайта
              otherPlayer.scoreText.setText(`Счет: ${score}`);//Обновляет текст счёта для спрайта
            }
          });
        }
}