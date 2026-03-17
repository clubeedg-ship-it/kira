const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

// Configuration
const PARTICLE_COUNT = 60;
const CONNECTION_DISTANCE = 150;
const WAVE_SPEED = 0.002;
const WAVE_AMPLITUDE = 20;

// Brand Colors (RGB for alpha manipulation)
const COLOR_PRIMARY = '0, 126, 188'; // #007ebc
const COLOR_ACCENT = '177, 212, 229'; // #b1d4e5

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    initParticles();
}

class Particle {
    constructor() {
        this.x = Math.random() * width;
        this.baseY = Math.random() * height;
        this.y = this.baseY;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 3 + 2; // Larger particles (2-5px)
        this.offset = Math.random() * 100; // Random offset for wave
    }

    update(time) {
        this.x += this.vx;

        // Wrap around screen
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;

        // Wave motion
        this.y = this.baseY + Math.sin(time * WAVE_SPEED + this.x * 0.005 + this.offset) * WAVE_AMPLITUDE;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${COLOR_PRIMARY}, 0.8)`; // High opacity
        ctx.fill();
    }
}

function initParticles() {
    particles = [];
    // Adjust particle count based on screen size
    const count = width < 768 ? 40 : PARTICLE_COUNT;
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function animate(time) {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
        p.update(time);
        p.draw();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONNECTION_DISTANCE) {
                const opacity = 1 - (distance / CONNECTION_DISTANCE);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(${COLOR_ACCENT}, ${opacity * 0.8})`; // High opacity
                ctx.lineWidth = 2.5; // Very visible lines
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(animate);
