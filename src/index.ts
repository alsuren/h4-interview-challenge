/**
 * This is an approximate simulation of a bouncing ball.
 * Gravity is applied after positions are calculated, and collisions with the
 * ground are evaluated last. This is approximately okay, as long as the simulation
 * interval is sufficiently small, but does cause balls to continue jiggling about
 * on the floor when they should be approximately stationary.
 *
 * I have added tests for each of the different *types* of function, but not gone
 * for 100% coverage of the click-handlers/glue code. I have written the code
 * so that each of the things on the TODO list below should be reasonably
 * easy and self-contained, but I would probably call this an MVP at this point,
 * and talk to stakeholders before working on it any further.
 *
 * TODO:
 * - Simulation accuracy improvements:
 *   - Re-work position/acceleration calculations to use:
 *         y[t] = y[0] + y'[0]*t + 1/2*y''t^2
 *   - Calculate the time of impact exactly, and attribute gravity correctly
 *     before + after the impact's discontinuity (to stop bouncing).
 * - Performance improvemts
 *   - Apply garbage collection periodically (instead of once per click) and pause
 *     the simulation loop if there are no balls in view.
 *   - Use requestAnimationFrame() rather than setInterval()
 */

// [x, y, x', y']. (x' and y' are typically called x_ and y_ in the codebase)
export type Ball = [number, number, number, number];
const COEFFICIENT_OF_RESTITUTION = 0.5;
// AKA y'' (which is why it is negative)
export const GRAVITY = -1000;
export const SIMULATION_INTERVAL_IN_SECONDS = 0.02;
export const SCATTER = 200;

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

export function timeToImpact([x, y, x_, y_]: Ball): number {
  // Finds t such that:
  //   0 =  y + y' t + 1/2 y'' t^2
  // Quadratic formula says:
  //   t = (-y' +/- sqrt(y' - 2 y'' y)) / y''
  // We want the solution that's in the future.
  if (isNaN(x) || isNaN(y) || isNaN(x_) || isNaN(y_)) {
    console.warn(`timeToImpact boom ${[x, y, x_, y_]}`);
    throw new Error(`${[x, y, x_, y_]}`);
  }
  return (-y_ - Math.sqrt(y_ * y_ - 2 * GRAVITY * y)) / GRAVITY;
}

export function flightTimeThisBounce(reboundVelocity: number): number {
  // simplified version of timeToImpact where y is 0 to start
  return (2 * reboundVelocity) / -GRAVITY;
}

export function timeToStillness(reboundVelocity: number): number {
  // infinite sum of flightTimeThisBounce() * COEFFICIENT_OF_RESTITUTION ^ i
  return (
    flightTimeThisBounce(reboundVelocity) *
    (1 + COEFFICIENT_OF_RESTITUTION / (1 - COEFFICIENT_OF_RESTITUTION))
  );
}

export function timeForNBounces(
  reboundVelocity: number,
  bounces: number
): number {
  // finite sum of flightTimeThisBounce() * COEFFICIENT_OF_RESTITUTION ^ i
  // period = flightTimeThisBounce() * (1 - r^i) / (1-r)
  if (bounces == 0) {
    return 0;
  }
  return (
    (flightTimeThisBounce(reboundVelocity) *
      Math.pow(1 - COEFFICIENT_OF_RESTITUTION, bounces)) /
    (1 - COEFFICIENT_OF_RESTITUTION)
  );
}

export function numberOfBouncesInPeriod(
  reboundVelocity: number,
  period: number
): number {
  // Sum of flightTimeThisBounce() * COEFFICIENT_OF_RESTITUTION ^ i is:
  // period = flightTimeThisBounce() * (1 - r^i) / (1-r)
  // (1-r) * period / flightTimeThisBounce() = (1 - r^i)
  // r^i  = 1 - (1-r) * period / flightTimeThisBounce()
  // Take logs both sides:
  // i * log(r) = log(1 - (1-r) * period / flightTimeThisBounce())
  // i = log(1 - (1-r) * period / flightTimeThisBounce()) / log(r)
  return Math.floor(
    Math.log(
      1 -
        ((1 - COEFFICIENT_OF_RESTITUTION) * period) /
          flightTimeThisBounce(reboundVelocity)
    ) / Math.log(COEFFICIENT_OF_RESTITUTION)
  );
}

export function simulateSingleBall(
  [x, y, x_, y_]: Ball,
  seconds: number
): Ball {
  const tti = timeToImpact([x, y, x_, y_]);
  if (tti > seconds) {
    // No impacts to worry about.
    y = y + y_ * seconds + 0.5 * GRAVITY * seconds * seconds;
    y_ += GRAVITY * seconds;
    x = x + x_ * seconds;

    return [x, y, x_, y_];
  } else {
    // 1 or more impacts to worry about.
    const reboundVelocity = -(y_ + GRAVITY * tti) * COEFFICIENT_OF_RESTITUTION;
    if (timeToStillness(reboundVelocity) < seconds) {
      // infinite impacts => grounded before the end of similation period
      return [x + x_ * seconds, 0, x_, 0];
    }
    // Skip simulating intermediate bounces because you might blow the stack
    const bounces = numberOfBouncesInPeriod(reboundVelocity, seconds - tti);
    const bounceTime = timeForNBounces(reboundVelocity, bounces);

    // Simulate the last bounce only
    return simulateSingleBall(
      [
        x + x_ * (tti + bounceTime),
        0,
        x_,
        reboundVelocity * Math.pow(COEFFICIENT_OF_RESTITUTION, bounces)
      ],
      seconds - (tti + bounceTime)
    );
  }
}

function simulate(balls: Ball[]) {
  for (const i in balls) {
    balls[i] = simulateSingleBall(balls[i], SIMULATION_INTERVAL_IN_SECONDS);
  }
}

export function garbageCollect(canvas: HTMLCanvasElement, balls: Ball[]) {
  // Cheeky in-place garbage collection. There are more performant ways to do this,
  // but it only happens once per user-click so I'm okay with it as it is.
  balls.splice(
    0,
    balls.length,
    ...balls.filter(([x]) => x > 0 && x < canvas.width)
  );
}

export function addBall(balls: Ball[], x: number, y: number) {
  balls.push([
    x,
    y,
    SCATTER * gaussianApproximation(),
    SCATTER * gaussianApproximation()
  ]);
}

function handleClick(event: MouseEvent, balls: Ball[]) {
  // click coordinate transform modified from
  // https://stackoverflow.com/questions/55677/
  const canvas = event.target as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = rect.bottom - event.clientY;
  addBall(balls, x, y);
  garbageCollect(canvas, balls);
  drawBalls(canvas, balls);
}

function handleResize(canvas: HTMLCanvasElement) {
  // idea taken from https://stackoverflow.com/a/18215701
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const balls: Ball[] = [];

  if (!canvas) {
    // We're being run in jest.
    return;
  }

  canvas.addEventListener("click", event => handleClick(event, balls));

  setInterval(() => {
    // FIXME: turn this into a requestAnimationFrame loop once the gravity-calculation
    // in simulateSingleBall() is fixed.
    simulate(balls);
    drawBalls(canvas, balls);
  }, 1000 * SIMULATION_INTERVAL_IN_SECONDS);

  window.addEventListener("resize", () => handleResize(canvas));
  handleResize(canvas);
}

main();
