import { BaseCollectible, CollectibleScoreContext, SpawnValidationContext } from "./BaseCollectible";

export class CheckpointCollectible extends BaseCollectible {
  private readonly goldBonus = 5;
  private readonly baseScore = 1;

  protected getSpawnEdgeConstraints(): { minEdge: number; maxEdge: number } {
    return { minEdge: 1, maxEdge: 4 };
  }

  isValidSpawnPosition(context: SpawnValidationContext): boolean {
    const { x, y, minBound, maxBound, color, existingCollectibles, gridMinX, gridMaxX, gridMinY, gridMaxY } = context;

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
            collectible.x === mX || collectible.x === MX ||
            collectible.y === mY || collectible.y === MY;
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
    const { collectible, gridColors, allCollectibles, color, components } = context;

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
      if (component.some((c) => c.x === collectible.x && c.y === collectible.y)) {
        myComponent = component;
        break;
      }
    }

    if (!myComponent) {
      return 0; // Not in any component
    }

    // Find all checkpoint collectibles of this color
    const componentSet = new Set(myComponent.map((c) => `${c.x},${c.y}`));
    const checkpointsInComponent = allCollectibles.filter((c) => {
      if (c.color !== color || c.type !== "checkpoint") return false;
    });

    if (checkpointsInComponent.some((c) => {
      // Check if claimed
      const cKey = `${c.x},${c.y}`;
      const cCell = gridColors.get(cKey);
      if (!cCell || cCell.color !== color) return false;

      // check if in component
      if (myComponent!.some((comp) => comp.x === c.x && comp.y === c.y)) return false;

      // check if is previous number
      return c.num == (collectible.num-1);
    })) return 0; // not connected to prev number

    let cluesInCheckpoint = checkpointsInComponent.length;

    if (checkpointsInComponent.every((c) => {
      // claimed?
      const cKey = `${c.x},${c.y}`;
      const cCell = gridColors.get(cKey);
      if (!cCell || cCell.color !== color) return false;

      // in component?
      if (myComponent!.some((comp) => comp.x === c.x && comp.y === c.y)) return false;

      // activated? (connected to previous)
      return c.isActivated;
    })) {
      cluesInCheckpoint += this.goldBonus; 
    } // gold bonus if all activated

    return (cluesInCheckpoint - 1) * this.baseScore;
  }


  isActivated(context: CollectibleScoreContext): boolean {
    const { collectible, gridColors, allCollectibles, color, components } = context;

    // Check if the collectible position has a painted tile of this color
    // ie. is claimed?
    const cellKey = `${collectible.x},${collectible.y}`;
    const cell = gridColors.get(cellKey);
    if (!cell || cell.color !== color) {
      return false;
    }

    // Find the component this collectible is in
    // ie. what connected to?
    let myComponent: Array<{ x: number; y: number }> | null = null;
    for (const component of components) {
      if (component.some((c) => c.x === collectible.x && c.y === collectible.y)) {
        myComponent = component;
        break;
      }
    }

    if (!myComponent) {
      return false;
    }

    // CHANGE
    // activate if connected to previous number

    // Filter collectibles of this color in the same component
    const checkpointInComponent = allCollectibles.filter((c) => {
      if (c.color !== color || c.type !== "checkpoint") return false;

      // Check if claimed
      const cKey = `${c.x},${c.y}`;
      const cCell = gridColors.get(cKey);
      if (!cCell || cCell.color !== color) return false;

      // check if in component
      if (myComponent!.some((comp) => comp.x === c.x && comp.y === c.y)) return false;

      // check if is previous number
      return c.num == (collectible.num-1);
    });

    // Activated if prev checkpoint found
    return checkpointInComponent.length == 1;
  }

  // to be gold
  isGold(context: CollectibleScoreContext): boolean {
    if (!this.isActivated(context)) return false; // activated?

    const { collectible, gridColors, allCollectibles, color, components } = context;

    let myComponent: Array<{ x: number; y: number }> | null = null;
    for (const component of components) {
      if (component.some((c) => c.x === collectible.x && c.y === collectible.y)) {
        myComponent = component;
        break;
      }
    }
    if (!myComponent) return false; // in component?

    const componentSet = new Set(myComponent.map((c) => `${c.x},${c.y}`));
    // filter by players checkpoints in component
    const checkpointsInComponent = allCollectibles.filter((c) => {
      if (c.color !== color || c.type !== "checkpoint") return false;
    });

    // are all players checkpoints ... 
    return checkpointsInComponent.every((c) => {
      // claimed?
      const cKey = `${c.x},${c.y}`;
      const cCell = gridColors.get(cKey);
      if (!cCell || cCell.color !== color) return false;

      // in component?
      if (myComponent!.some((comp) => comp.x === c.x && comp.y === c.y)) return false;

      // activated? (connected to previous)
      return c.isActivated;
    }
    );
  }
}
