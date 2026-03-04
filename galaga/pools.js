// ============================================================
// pools.js - 对象池 (零内存分配策略)
// ============================================================

const particlePool = [];
const trailPool = [];
const projectilePool = [];
const enemyProjectilePool = [];
const trackingMissilePool = [];

function getParticle(x, y, color, scale) {
    let p = particlePool.pop();
    if (p) { p.reset(x, y, color, scale); return p; }
    return new Particle(x, y, color, scale);
}

function recycleParticle(p) {
    particlePool.push(p);
}

function getTrail(x, y, color, size) {
    let t = trailPool.pop();
    if (t) { t.reset(x, y, color, size); return t; }
    return new Trail(x, y, color, size);
}

function recycleTrail(t) {
    trailPool.push(t);
}

function getProjectile(x, y) {
    let p = projectilePool.pop();
    if (p) { p.reset(x, y); return p; }
    return new Projectile(x, y);
}

function recycleProjectile(p) {
    p._remove = false;
    projectilePool.push(p);
}

function getEnemyProjectile(x, y) {
    let ep = enemyProjectilePool.pop();
    if (ep) { ep.reset(x, y); return ep; }
    return new EnemyProjectile(x, y);
}

function getTrackingMissile(x, y) {
    let ep = trackingMissilePool.pop();
    if (ep) { ep.reset(x, y); return ep; }
    return new TrackingMissile(x, y);
}

function recycleEnemyProjectile(ep) {
    ep._remove = false; // reset state to prevent ghost deletion
    if (ep.isTrackingMissile) {
        trackingMissilePool.push(ep);
    } else {
        enemyProjectilePool.push(ep);
    }
}
