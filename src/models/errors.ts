export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class UniqueConstraintError extends DatabaseError {
  constructor(
    public readonly field: string,
    public readonly value: string
  ) {
    super(`${field} already exists: ${value}`);
    this.name = 'UniqueConstraintError';
  }
}

export class ForeignKeyConstraintError extends DatabaseError {
  constructor(
    public readonly field: string,
    public readonly value: number | string
  ) {
    super(`Referenced ${field} does not exist: ${value}`);
    this.name = 'ForeignKeyConstraintError';
  }
}
