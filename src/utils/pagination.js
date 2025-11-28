const mysql = require('mysql2');
const z = require('zod');
const { executeQuery } = require('../config/database');
const Paginated = require('./paginated');

const buildPaginationClause = ({ page, pageSize }) => {
  if (page === -1) {
    return '';
  }

  // Calculate offset: page 1 should start at offset 0, page 2 at offset pageSize, etc.
  const offset = (page - 1) * pageSize;
  return mysql.format('LIMIT ? OFFSET ?', [pageSize, offset]);
};

async function paginatedQuery(
  query,
  {
    params = [],
    paginationClause = '',
    orderByClause = '',
    filtersClause = 'true',
    parseItem = x => x
  }
) {
  const [[{ count }], items] = await Promise.all([
    executeQuery(
      `
        WITH query AS (${query})
        SELECT COUNT(*) AS count
        FROM query
        WHERE ${filtersClause};
      `,
      params
    ),
    executeQuery(
      `
        WITH query AS (${query})
        SELECT *
        FROM query
        WHERE ${filtersClause}
        ${orderByClause}
        ${paginationClause};
      `,
      params
    )
  ]);

  return new Paginated(count, items.map(parseItem));
}

const paginationQueryParams = z.object({
  page: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(-1))
    .default('0'),
  pageSize: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(0))
    .default('25')
});

async function paginatedQueryForGetById(
  query,
  {
    params = [],
    paginationClause = '',
    orderByClause = '',
    filtersClause = 'true',
    parseItem = x => x
  }
) {
  const [[{ count }], items] = await Promise.all([
    executeQuery(
      `
        WITH query AS (${query})
        SELECT COUNT(*) AS count
        FROM query
        WHERE ${filtersClause};
      `,
      params
    ),
    executeQuery(
      `
        WITH query AS (${query})
        SELECT *
        FROM query
        WHERE ${filtersClause}
        ${orderByClause}
        ${paginationClause};
      `,
      params
    )
  ]);

  // Await async parseItem results
  const parsedItems = await Promise.all(items.map(parseItem));

  return new Paginated(count, parsedItems);
}

module.exports = {
  buildPaginationClause,
  paginatedQuery,
  paginatedQueryForGetById,
  paginationQueryParams
};
