/**
 * This file contains the tools required to turn a filter query (key-value object
 * of filter names and values) into a SQL expression.
 *
 * The SQL expression, henceforth "filtersClause," is generated from a query per a
 * "spec." The spec is a mapping of query keys to functional combinators
 * (functions which combine data and/or functions to produce more functions.)
 *
 * Functional combinators is a fancy technical name, but it may be best explained
 * by an example. Take the following filter spec:
 *
 *   const spec = { search: contains({ column: 'name' }) };
 *
 * When the spec is passed with the query `{ search: 'Bob' }`, we produce the
 * filters clause '`name` LIKE '%Bob%'. This is because `conatins` returns a
 * function which takes the value of `search` and converts it into a filters
 * clause.
 *
 * However, suppose that `search` was an optional query param. In that case, if we
 * used the same spec, we'd get the filters clause '`name` LIKE '%%''. But we'd
 * prefer to generate no expression, or a base expression matching all `name`s.
 * (ie. 'true'.) The solution is to use the `optional` combinator:
 *
 *   const spec = { search: optional(contains({ column: 'name' })) };
 *
 * `optional` applies the filter if and only if the argument is truethy (not null,
 * not an empty string, etc.) This is the main advantage of combinators, they
 * compose really well.
 *
 * See `buildFiltersClause`, as it's the main interface of this "library."
 */

const mysql = require("mysql2");

/**
 * @typedef {string | number | Date | null} IFilterable
 */

/**
 * @template T
 * @typedef {(value: T) => string | null} FilterSpecItem
 */

/**
 * @typedef {object} ColumnArg
 * @property {string} column
 */

/**
 * @param {ColumnArg} arg
 * @returns {FilterSpecItem<string>}
 */
function optional(comb) {
	return (value) => {
		if (!value) {
			return null;
		}

		return comb(value);
	};
}

/**
 * @param {ColumnArg} arg
 * @returns {FilterSpecItem<string>}
 */
function contains(arg) {
	return (value) => {
		const columnEscaped = mysql.escapeId(arg.column);
		const valueEscaped = mysql.escape("%" + value + "%");
		return `${columnEscaped} LIKE ${valueEscaped}`;
	};
}

/**
 * Note, passing `arg.unsafeLiteralColumn` will disable escaping. This SHOULD
 * NEVER be used with any user input as it is vulnerable to SQL injection.
 *
 * @template {IFilterable} T
 * @param {ColumnArg & { unsafeLiteralColumn: string }} arg
 * @returns {FilterSpecItem<T>}
 */
function equal(arg) {
	return (value) => {
		const columnEscaped = arg.unsafeLiteralColumn ?? mysql.escapeId(arg.column);
		const valueEscaped = mysql.escape(value);
		return `${columnEscaped} = ${valueEscaped}`;
	};
}

/**
 * @template {IFilterable} T
 * @param {ColumnArg} arg
 * @returns {FilterSpecItem<T>}
 */
function lessThanEqual(arg) {
	return (value) => {
		const columnEscaped = mysql.escapeId(arg.column);
		const valueEscaped = mysql.escape(value);
		return `${columnEscaped} <= ${valueEscaped}`;
	};
}

/**
 * @template {IFilterable} T
 * @param {ColumnArg} arg
 * @returns {FilterSpecItem<T>}
 */
function greaterThanEqual(arg) {
	return (value) => {
		const columnEscaped = mysql.escapeId(arg.column);
		const valueEscaped = mysql.escape(value);
		return `${columnEscaped} >= ${valueEscaped}`;
	};
}

/**
 * @param {string[]) columns
 * @returns {FilterSpecItem<string>}
 */
function searchAcross(columns) {
	return (s) => {
		const query = mysql.escape("%" + s + "%");
		return "(" + columns.map((c) => `${c} LIKE ${query}`).join(" OR ") + ")";
	};
}

/**
 * Build a filters clause for a spec `filterSpec` over some query `filters`.
 *
 * @template T
 * @param {T} filters
 * @param {{ [P in keyof T]: FilterSpecItem<P> }} filterSpec
 * @returns {string}
 */
function buildFiltersClause(filters, filterSpec) {
	const filterExprs = [];

	for (const [column, buildFilterExpr] of Object.entries(filterSpec)) {
		const filterExpr = buildFilterExpr(filters[column]);
		if (filterExpr) {
			filterExprs.push(filterExpr);
		}
	}

	if (filterExprs.length === 0) {
		return "true";
	}

	return filterExprs.join(" AND ");
}

module.exports = {
	optional,
	contains,
	equal,
	lessThanEqual,
	greaterThanEqual,
	searchAcross,
	buildFiltersClause,
};
