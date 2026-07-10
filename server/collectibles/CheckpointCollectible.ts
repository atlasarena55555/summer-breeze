import {
  BaseCollectible,
  CollectibleScoreContext,
  SpawnValidationContext,
} from "./BaseCollectible";

export class CheckpointCollectible extends BaseCollectible {
  private readonly goldBonus = 5;
  private readonly baseScore = 1;

  /**
   * Checkpoints are event-driven: painting a future checkpoint does not claim
   * it retroactively after an earlier checkpoint is collected. A checkpoint
   * can only advance the sequence by exactly one, starting at zero.
   */
  onClaim(context: CollectibleScoreContext): void {
    const { collectible, gridColors, allCollectibles, color, components } =
      context;

    if (collectible.isActivated) return;

    const checkpoints = allCollectibles.filter(
      (candidate) =>
        candidate.type === "checkpoint" && candidate.color === color
    );
    const highestClaimedNumber = checkpoints.reduce(
      (highest, candidate) =>
        candidate.isActivated ? Math.max(highest, candidate.num) : highest,
      -1
    );

    // Reject skipped checkpoints and attempts to go back to an old number.
    if (collectible.num !== highestClaimedNumber + 1) return;

    const cell = gridColors.get(`${collectible.x},${collectible.y}`);
    if (!cell || cell.color !== color) return;

    const component = components.find((candidate) =>
      candidate.some(
        (cell) => cell.x === collectible.x && cell.y === collectible.y
      )
    );
    if (!component) return;

    if (collectible.num === 0) {
      collectible.isActivated = true;
      return;
    }

    const componentCells = new Set(
      component.map((cell) => `${cell.x},${cell.y}`)
    );
    const previousCheckpointIsConnected = checkpoints.some(
      (candidate) =>
        candidate.num === collectible.num - 1 &&
        candidate.isActivated &&
        componentCells.has(`${candidate.x},${candidate.y}`)
    );

    if (previousCheckpointIsConnected) {
      collectible.isActivated = true;
    }
  }

  protected getSpawnEdgeConstraints(): { minEdge: number; maxEdge: number } {
    return { minEdge: 1, maxEdge: 4 };
  }

  isValidSpawnPosition(context: SpawnValidationContext): boolean {
    const {
      x,
      y,
      minBound,
      maxBound,
      color,
      existingCollectibles,
      gridMinX,
      gridMaxX,
      gridMinY,
      gridMaxY,
    } = context;

    // Check if position is within bounds
    if (x < minBound || x > maxBound || y < minBound || y > maxBound) {
      return false;
    }

    // Check if this position is on the outermost edge (edge 1)
    // Use rectangular grid bounds when available, fall back to square bounds
    const mX = gridMinX ?? minBound;
    const MX = gridMaxX ?? maxBound;
    const mY = gridMinY ?? minBound;
    const MY = gridMaxY ?? maxBound;
    const isOnOuterEdge = x === mX || x === MX || y === mY || y === MY;

    if (isOnOuterEdge) {
      // Only 1 checkpoint collectible of each color allowed on the outermost edge
      let edgeCount = 0;
      for (const collectible of existingCollectibles) {
        if (collectible.type === "checkpoint" && collectible.color === color) {
          const isCollectibleOnOuterEdge =
            collectible.x === mX ||
            collectible.x === MX ||
            collectible.y === mY ||
            collectible.y === MY;
          if (isCollectibleOnOuterEdge) {
            edgeCount++;
          }
        }
      }

      if (edgeCount >= 1) {
        return false;
      }
    }

    return true;
  }

  calculateScore(context: CollectibleScoreContext): number {
    const { collectible, gridColors, allCollectibles, color, components } =
      context;

    // Find which component this collectible belongs to (if any)
    let myComponent: Array<{ x: number; y: number }> | null = null;

    // Check if the collectible position has a painted tile of this color
    const cellKey = `${collectible.x},${collectible.y}`;
    const cell = gridColors.get(cellKey);
    if (!cell || cell.color !== color) {
      return 0; // Not claimed by this color
    }

    // Find the component this collectible is in
    for (const component of components) {
      if (
        component.some((c) => c.x === collectible.x && c.y === collectible.y)
      ) {
        myComponent = component;
        break;
      }
    }

    if (!myComponent) {
      return 0; // Not in any component
    }

    if (!collectible.isActivated) return 0;

    // Find all checkpoint collectibles of this color
    const componentSet = new Set(myComponent.map((c) => `${c.x},${c.y}`));
    const playersCheckpoints = allCollectibles.filter(
      (candidate) =>
        candidate.color === color && candidate.type === "checkpoint"
    );

    const goGold = playersCheckpoints.every((c) => {
      // claimed?
      const cKey = `${c.x},${c.y}`;
      const cCell = gridColors.get(cKey);
      if (!cCell || cCell.color !== color) return false;

      // in component?
      if (!componentSet.has(`${c.x},${c.y}`)) return false;

      // activated? (connected to previous)
      return c.isActivated;
    });

    return this.baseScore + (goGold ? this.goldBonus : 0);
  }

  isActivated(context: CollectibleScoreContext): boolean {
    // Claim state is persistent between score recalculations. It is updated
    // only by onClaim and explicitly reset when the board is cleared.
    return context.collectible.isActivated;
  }

  // to be gold
  isGold(context: CollectibleScoreContext): boolean {
    if (!context.collectible.isActivated) return false;

    const { collectible, gridColors, allCollectibles, color, components } =
      context;

    let myComponent: Array<{ x: number; y: number }> | null = null;
    for (const component of components) {
      if (
        component.some((c) => c.x === collectible.x && c.y === collectible.y)
      ) {
        myComponent = component;
        break;
      }
    }
    if (!myComponent) return false; // in component?

    const componentSet = new Set(myComponent.map((c) => `${c.x},${c.y}`));

    // filter by players checkpoints in component
    const playersCheckpoints = allCollectibles.filter(
      (candidate) =>
        candidate.color === color && candidate.type === "checkpoint"
    );

    // are all players checkpoints ...
    return playersCheckpoints.every((c) => {
      // claimed?
      const cKey = `${c.x},${c.y}`;
      const cCell = gridColors.get(cKey);
      if (!cCell || cCell.color !== color) return false;

      // in component?
      if (!componentSet.has(`${c.x},${c.y}`)) return false;

      // activated? (connected to previous)
      return c.isActivated;
    });
  }
}
