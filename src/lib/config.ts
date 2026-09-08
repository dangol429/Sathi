/**
 * Which data the app is running on.
 *
 * Default true: the flag has to be deliberately switched off, so a missing env
 * var never silently points a half-wired feature at an empty database.
 *
 * Read this nowhere except lib/api — components should not know or care which
 * side of the switch they are on. That is the whole point of the switch.
 */
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
