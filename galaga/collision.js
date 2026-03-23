// ============================================================
// collision.js - 碰撞检测与爆炸效果
// ============================================================

function createExplosion(x, y, color, scale = 1) {
    const count = Math.floor(15 * scale);
    for (let i = 0; i < count; i++) {
        particles.push(getParticle(x, y, color, scale));
    }
}

function handleCollisions() {
    // Mark-and-sweep: iterate projectiles vs enemies
    projectiles.forEach(p => {
        if (p._remove) return;

        // Collision with regular enemies
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (e._remove || p._remove) continue;

            if (p.x < e.x + e.width &&
                p.x + p.width > e.x &&
                p.y < e.y + e.height &&
                p.y + p.height > e.y) {

                // Hit!
                if (e.shield > 0) {
                    e.shield--;
                    if (e.shield <= 0) {
                        playSound('explosion'); // shield break sound
                        createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#0000ff', 1.5);
                    } else {
                        e.hitFlashTimer = 100; // Visual feedback for non-lethal shield hit
                    }
                } else {
                    e.health--;
                    if (e.health <= 0) {
                        playSound('explosion');
                        const config = ENEMY_CONFIG[e.type] || ENEMY_CONFIG[1];
                        createExplosion(e.x + e.width / 2, e.y + e.height / 2, config.color, config.scale);
                        score += e.points;

                        if (isChallengeStage) {
                            challengeEnemiesDefeated++;
                        }

                        e._remove = true; // Mark for removal

                        // Drop Power-up
                        if (Math.random() < POWERUP_DROP_CHANCE) {
                            const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
                            powerUps.push(new PowerUp(e.x, e.y, type));
                        }

                        if (score > highScore) {
                            highScore = score;
                            try {
                                localStorage.setItem('galaga-high-score', highScore);
                            } catch (e) {
                                console.warn('localStorage not available, high score not saved');
                            }
                            highScoreEl.textContent = highScore;
                        }
                    } else {
                        // Visual feedback for non-lethal hit
                        e.hitFlashTimer = 100;
                    }
                }

                p._remove = true; // Mark projectile for removal
                if (uiCache.score !== score) {
                    uiCache.score = score;
                    scoreEl.textContent = score;
                }
                break; // This projectile is consumed
            }
        }

        // Collision with boss parts
        if (!p._remove && boss && boss.state === 'active') {
            boss.parts.forEach(part => {
                if (p._remove) return;
                if (part.active &&
                    p.x < boss.x + part.offsetX + part.width / 2 &&
                    p.x + p.width > boss.x + part.offsetX - part.width / 2 &&
                    p.y < boss.y + boss.yOffset + part.offsetY + part.height / 2 &&
                    p.y + p.height > boss.y + boss.yOffset + part.offsetY - part.height / 2) {

                    part.health--;
                    p._remove = true;
                    playSound('shoot');

                    if (part.health <= 0) {
                        part.active = false;
                        createExplosion(boss.x + part.offsetX, boss.y + boss.yOffset + part.offsetY, '#ffaa00', 1.5);
                        playSound('explosion');
                        score += SCORE_BOSS_PART;
                        if (uiCache.score !== score) {
                            uiCache.score = score;
                            scoreEl.textContent = score;
                        }

                        // Check if all parts are destroyed
                        if (boss.parts.every(bp => !bp.active)) {
                            boss.state = 'dying';
                            boss.deathTimer = 100;
                        } else {
                            // Drop powerup when wing destroyed
                            const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
                            powerUps.push(new PowerUp(boss.x + part.offsetX, boss.y + boss.yOffset + part.offsetY, type));
                        }
                    }
                }
            });
        }

        // Collision with enemy tracking missiles
        if (!p._remove) {
            for (let j = enemyProjectiles.length - 1; j >= 0; j--) {
                const ep = enemyProjectiles[j];
                if (ep._remove) continue;

                if (ep instanceof TrackingMissile) {
                    if (p.x < ep.x + ep.width &&
                        p.x + p.width > ep.x &&
                        p.y < ep.y + ep.height &&
                        p.y + p.height > ep.y) {

                        p._remove = true;

                        // Immediately recycle and remove the missile so it disappears
                        recycleEnemyProjectile(ep);
                        enemyProjectiles.splice(j, 1);

                        createExplosion(ep.x + ep.width / 2, ep.y + ep.height / 2, '#ff8800', 0.8);
                        playSound('explosion');
                        score += 50;
                        if (uiCache.score !== score) {
                            uiCache.score = score;
                            scoreEl.textContent = score;
                        }
                        break;
                    }
                }
            }
        }
    });

    // Sweep: remove marked projectiles and enemies in-place
    for (let i = projectiles.length - 1; i >= 0; i--) {
        if (projectiles[i]._remove) {
            recycleProjectile(projectiles[i]);
            projectiles.splice(i, 1);
        }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i]._remove) enemies.splice(i, 1);
    }

    // Collision with Boss body
    if (boss && boss.state === 'active') {
        if (boss.y + boss.yOffset + boss.height / 2 > player.y &&
            boss.x - boss.width / 2 < player.x + player.width &&
            boss.x + boss.width / 2 > player.x) {

            if (player.shieldLevel > 0) {
                player.shieldLevel--;
                boss.yOffset -= 50;
                createExplosion(player.x + player.width / 2, player.y, '#00d4ff', 1.5);
                shakeDuration = 10;
                shakeMagnitude = 5;
            } else {
                gameOver();
            }
        }
    }

    // Enemy-player collision: only trigger for formation enemies, not entering/flyby
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];

        if (e.state !== 'entering' && e.state !== 'challenge_flyby') {
            if (e.y < player.y + player.height &&
                e.y + e.height > player.y &&
                e.x < player.x + player.width &&
                e.x + e.width > player.x) {

                if (player.shieldLevel > 0) {
                    player.shieldLevel--;
                    enemies.splice(i, 1);
                    const config = ENEMY_CONFIG[e.type] || ENEMY_CONFIG[1];
                    createExplosion(e.x + e.width / 2, e.y + e.height / 2, config.color, config.scale);
                    shakeDuration = 10;
                    shakeMagnitude = 5;
                } else {
                    gameOver();
                }
            }
        }
        if (e.y > CANVAS_HEIGHT && e.state === 'formation' && !e.isDiving) {
            gameOver();
        }
    }

    // Enemy projectile collision
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const ep = enemyProjectiles[i];
        if (ep.x < player.x + player.width &&
            ep.x + ep.width > player.x &&
            ep.y < player.y + player.height &&
            ep.y + ep.height > player.y) {
            if (player.shieldLevel > 0) {
                player.shieldLevel--;
                recycleEnemyProjectile(enemyProjectiles[i]);
                enemyProjectiles.splice(i, 1);
                createExplosion(ep.x, ep.y, '#00d4ff', 1);
                shakeDuration = 10;
                shakeMagnitude = 5;
            } else {
                gameOver();
            }
        }
    }

    // Power-up collection
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        if (pu.x < player.x + player.width &&
            pu.x + pu.width > player.x &&
            pu.y < player.y + player.height &&
            pu.y + pu.height > player.y) {

            if (pu.type === 'D') player.dualShotTimer = gameTime + DUAL_SHOT_DURATION;
            if (pu.type === 'S') player.shieldLevel++;
            if (pu.type === 'R') player.rapidFireTimer = gameTime + RAPID_FIRE_DURATION;

            powerUps.splice(i, 1);
            playSound('shoot');
        }
    }
}
