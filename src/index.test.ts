// Jest tests don't give useful stack traces in firefox.
// This seems to be related to this issue:
// https://github.com/codesandbox/codesandbox-client/issues/502
import {
  SCATTER,
  garbageCollect,
  gaussianApproximation,
  drawBalls,
  addBall
} from ".";
import { Ball } from "./simulation";

const realRandom = Math.random;
const fakeRandom = jest.fn();
beforeEach(() => {
  fakeRandom.mockReset();
  fakeRandom.mockImplementation(realRandom);
  Math.random = fakeRandom;
});
afterEach(() => {
  Math.random = realRandom;
});

describe("gaussianApproximation", () => {
  it("sums the value of Math.random", () => {
    fakeRandom.mockReturnValue(1);
    expect(gaussianApproximation()).toBe(3);
    fakeRandom.mockReturnValue(0);
    expect(gaussianApproximation()).toBe(-3);
    fakeRandom.mockReturnValue(0.5);
    expect(gaussianApproximation()).toBe(0);
  });

  it("is bounded", () => {
    const result = gaussianApproximation();
    expect(result).toBeLessThanOrEqual(3);
    expect(result).toBeGreaterThanOrEqual(-3);
  });
});

describe("addBall", () => {
  it("adds a ball with a 'random' velocity", () => {
    const points = [] as Ball[];
    fakeRandom.mockReturnValue(1);
    addBall(points, 10, 20);
    expect(points).toEqual([[10, 20, 3 * SCATTER, 3 * SCATTER]]);
  });
});

describe("drawBalls", () => {
  it("translates coordinates and draws a single ball", () => {
    const ctx = {
      clearRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn()
    };
    const canvas = ({
      getContext: jest.fn(() => ctx),
      height: 1000
    } as unknown) as HTMLCanvasElement;
    const balls = [[10, 20, 0, 0]] as Ball[];

    drawBalls(canvas, balls);

    // This test is overly mocky :(
    expect(ctx.clearRect).toBeCalled();
    expect(ctx.beginPath).toBeCalled();
    expect(ctx.arc).toBeCalledWith(10, 1000 - 20, 2, 0, 2 * Math.PI);
    expect(ctx.fill).toBeCalled();
  });
});

describe("garbageCollect", () => {
  it("only keeps things that are within horizontal bounds", () => {
    const points = ([[-100], [100], [2000]] as unknown) as Ball[];
    expect(
      garbageCollect({ width: 1000 } as HTMLCanvasElement, points)
    ).toEqual([[100]]);
  });
});
