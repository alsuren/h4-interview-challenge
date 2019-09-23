import {
  simulateSingleBall,
  timeToStillness,
  timeToImpact,
  flightTimeThisBounce,
  numberOfBouncesInPeriod,
  timeForNBounces,
  GRAVITY,
  COEFFICIENT_OF_RESTITUTION
} from "./simulation";

describe("timeToImpact", () => {
  it("calculates drops from the sky", () => {
    expect(timeToImpact([0, 2 * -GRAVITY, 0, 0])).toEqual(2);
  });
  it("caclulates launches from the floor", () => {
    expect(timeToImpact([0, 0, 0, -GRAVITY])).toEqual(2);
  });
  it("aggrees with flightTimeThisBounce()", () => {
    expect(timeToImpact([0, 0, 0, -GRAVITY])).toEqual(
      flightTimeThisBounce(-GRAVITY)
    );
  });
});

describe("timeToStillness()", () => {
  it("calculates the infinite series", () => {
    expect(timeToStillness(-GRAVITY)).toEqual(4);
  });
  it("is already stopped if stationary", () => {
    expect(timeToStillness(0)).toEqual(0);
  });
});

describe("timeForNBounces()", () => {
  it("takes no time for 0 bounces", () => {
    expect(timeForNBounces(-GRAVITY, 0)).toEqual(0);
  });
  it("gets a single bounce correct", () => {
    expect(timeForNBounces(-GRAVITY, 1)).toEqual(
      flightTimeThisBounce(-GRAVITY)
    );
  });
});
describe("numberOfBouncesInPeriod()", () => {
  it("does 0 bounces in 0 seconds", () => {
    expect(numberOfBouncesInPeriod(-GRAVITY, 0.01)).toEqual(0);
  });
  it("does 1 bounce in 1 bounce's time", () => {
    expect(
      numberOfBouncesInPeriod(-GRAVITY, flightTimeThisBounce(-GRAVITY))
    ).toEqual(1);
  });
  it("does 0 bounces in less than 1 bounce's time", () => {
    expect(
      numberOfBouncesInPeriod(-GRAVITY, flightTimeThisBounce(-GRAVITY) - 0.01)
    ).toEqual(0);
  });
});

describe("simulateSingleBall", () => {
  it("falls from stationary at 1/2 g t^2", () => {
    expect(simulateSingleBall([0, 2000, 0, 0], 1)).toEqual([
      0,
      2000 + 0.5 * GRAVITY,
      0,
      GRAVITY
    ]);
  });
  it("applies horizontal velocity correctly", () => {
    expect(simulateSingleBall([1000, 0, 1, 0], 1)).toEqual([1001, 0, 1, 0]);
  });

  it("bounces and reaches a stationary peak at a lower height", () => {
    const h = 2 * -GRAVITY;
    expect(simulateSingleBall([0, h, 0, 0], 3)).toEqual([
      0,
      h * COEFFICIENT_OF_RESTITUTION * COEFFICIENT_OF_RESTITUTION,
      0,
      0
    ]);
  });
});
