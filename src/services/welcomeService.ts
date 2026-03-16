export enum VersionChangeType {
    None,
    FirstInstall,
    Upgrade,
}

/**
 * Determines the type of version change based on current and last seen versions.
 * @param current The current extension version (Major.Minor.Patch)
 * @param lastSeen The version stored in globalState (Major.Minor.Patch)
 */
export function getVersionChangeType(current: string, lastSeen: string | undefined): VersionChangeType {
    if (lastSeen === undefined) {
        return VersionChangeType.FirstInstall;
    }

    if (current === lastSeen) {
        return VersionChangeType.None;
    }

    const currentParts = current.split('.').map(Number);
    const lastSeenParts = lastSeen.split('.').map(Number);

    // Major change
    if (currentParts[0] > lastSeenParts[0]) {
        return VersionChangeType.Upgrade;
    }

    // Minor change
    if (currentParts[0] === lastSeenParts[0] && currentParts[1] > lastSeenParts[1]) {
        return VersionChangeType.Upgrade;
    }

    // Patch or Older (None trigger for welcome)
    return VersionChangeType.None;
}
