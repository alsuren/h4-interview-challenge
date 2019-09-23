import { simulateManyBalls, Ball } from "./simulation";

export const SCATTER = 250;

export function gaussianApproximation() {
  // Approximate a gaussian distribution using the central limit theorem.
  // This is the Irwin–Hall distribution, so the variance will be n/12.
  // Variance is compensated for in the SCATTER contant (which is tuned by eye
  // in practice).
  const n = 6;
  let result = 0;
  for (let i = 0; i < n; i++) {
    result += Math.random() - 0.5;
  }
  return result;
}

export function drawBalls(canvas: HTMLCanvasElement, balls: Ball[]) {
  // y=0 at the bottom of the canvas for my own sanity.
  // The canvas point drawing code is derived from a tfjs demo that I was using
  // as a prototyping template last month (Apache License):
  // https://github.com/tensorflow/tfjs-models/blob/master/posenet/demos/demo_util.js#L78-L83
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const [x, y] of balls) {
    ctx.beginPath();
    ctx.arc(x, canvas.height - y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "black";
    ctx.fill();
  }
}

export function garbageCollect(
  canvas: HTMLCanvasElement,
  balls: Ball[]
): Ball[] {
  return balls.filter(([x]) => x > 0 && x < canvas.width);
}

export function addBall(balls: Ball[], x: number, y: number) {
  balls.push([
    x,
    y,
    SCATTER * gaussianApproximation(),
    SCATTER * gaussianApproximation()
  ]);
}

class UserInterface {
  balls: Ball[];
  canvas: HTMLCanvasElement;
  callbackId?: number;
  lastTimestamp?: number;

  constructor({ balls, canvas }) {
    this.balls = balls;
    this.canvas = canvas;
  }

  handleResize() {
    // idea taken from https://stackoverflow.com/a/18215701
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  handleClick(event: MouseEvent) {
    // click coordinate transform modified from
    // https://stackoverflow.com/questions/55677/
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = rect.bottom - event.clientY;

    addBall(this.balls, x, y);
    this.startSimulationIfNeeded();
  }

  startSimulationIfNeeded() {
    if (!this.callbackId) {
      this.callbackId = requestAnimationFrame(() => this.doSimulation());
    }
  }

  doSimulation() {
    const now = Date.now();
    if (!this.lastTimestamp) {
      // Simulate a 0 second period for the first frame after a restart.
      this.lastTimestamp = now;
    }
    const duration = now - this.lastTimestamp;
    this.balls = simulateManyBalls(this.balls, duration / 1000);
    this.balls = garbageCollect(this.canvas, this.balls);
    drawBalls(this.canvas, this.balls);

    if (this.balls.length === 0) {
      console.log("No more balls. Stopping.");
      this.lastTimestamp = null;
      this.callbackId = null;
      return;
    }
    this.lastTimestamp = now;
    this.callbackId = requestAnimationFrame(() => this.doSimulation());
  }
}

function main() {
  if (!document || !document.getElementById("canvas")) {
    // We're being run in jest.
    return;
  }

  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ui = new UserInterface({ balls: [], canvas });

  canvas.addEventListener("click", event => ui.handleClick(event));
  window.addEventListener("resize", () => ui.handleResize());
  ui.handleResize();
}

main();
