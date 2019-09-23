/**
 * [x, y, x', y']. (x' and y' are typically called x_ and y_ in the codebase)
 */

export type Ball = [number, number, number, number];

export const COEFFICIENT_OF_RESTITUTION = 0.5;
// AKA y'' (which is why it is negative)
export const GRAVITY = -1000;

export function timeToImpact([x, y, x_, y_]: Ball): number {
  // Finds t such that:
  //   0 =  y + y' t + 1/2 y'' t^2
  // Quadratic formula says:
  //   t = (-y' +/- sqrt(y' - 2 y'' y)) / y''
  // We want the solution that's in the future.
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
  if (bounces === 0) {
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

function simulateWithoutImpacts([x, y, x_, y_]: Ball, seconds: number): Ball {
  y = y + y_ * seconds + 0.5 * GRAVITY * seconds * seconds;
  y_ += GRAVITY * seconds;
  x = x + x_ * seconds;
  return [x, y, x_, y_];
}

function simulateAfterImpact([x, y, x_, y_]: Ball, seconds: number): Ball {
  const reboundVelocity = y_;
  if (timeToStillness(reboundVelocity) < seconds) {
    // infinite impacts => grounded before the end of similation period
    return [x + x_ * seconds, 0, x_, 0];
  }
  // Skip simulating intermediate bounces because you might blow the stack
  const bounces = numberOfBouncesInPeriod(reboundVelocity, seconds);
  const bounceTime = timeForNBounces(reboundVelocity, bounces);
  // Simulate after the last bounce only
  return simulateWithoutImpacts(
    [
      x + x_ * bounceTime,
      0,
      x_,
      reboundVelocity * Math.pow(COEFFICIENT_OF_RESTITUTION, bounces)
    ],
    seconds - bounceTime
  );
}

export function simulateSingleBall(ball: Ball, seconds: number): Ball {
  const tti = timeToImpact(ball);
  if (tti > seconds) {
    // No impacts to worry about.
    return simulateWithoutImpacts(ball, seconds);
  } else {
    // 1 or more impacts to worry about.
    const [x, y, x_, y_] = simulateWithoutImpacts(ball, tti);
    return simulateAfterImpact(
      [x, y, x_, -COEFFICIENT_OF_RESTITUTION * y_],
      seconds - tti
    );
  }
}

export function simulateManyBalls(balls: Ball[], seconds: number): Ball[] {
  return balls.map(b => simulateSingleBall(b, seconds));
}
