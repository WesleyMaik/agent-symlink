/**
 * Base domain error for symlink operations.
 */
export class SymlinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the source path does not exist and dangling links are not allowed.
 */
export class SourceNotFoundError extends SymlinkError {
  constructor(public readonly sourcePath: string) {
    super(`Source "${sourcePath}" does not exist. Use --allow-dangling to link non-existent sources.`);
  }
}

/**
 * Thrown when the target already exists as a regular file/dir or a conflicting symlink without --force.
 */
export class TargetExistsError extends SymlinkError {
  constructor(
    public readonly targetPath: string,
    public readonly targetType: 'file' | 'directory' | 'symlink'
  ) {
    super(
      `Target "${targetPath}" already exists as a ${targetType}. Use --force to overwrite it.`
    );
  }
}

/**
 * Thrown when source and target resolve to the exact same path or form a circular link.
 */
export class CircularLinkError extends SymlinkError {
  constructor(public readonly sourcePath: string, public readonly targetPath: string) {
    super(`Cannot link path to itself or create a circular link: "${sourcePath}" -> "${targetPath}".`);
  }
}

/**
 * Thrown when operating system permissions or developer mode prevent symbolic link creation.
 */
export class PlatformPrivilegeError extends SymlinkError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Thrown when a specified path is invalid or empty.
 */
export class InvalidPathError extends SymlinkError {
  constructor(message: string) {
    super(message);
  }
}
