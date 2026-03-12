const Portfolio = require('../models/Portfolio');

/**
 * Converts a string into a URL-friendly slug.
 * e.g. "My Portfolio!" => "my-portfolio"
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Generates a unique slug by appending an incrementing counter
 * if the base slug already exists in the database.
 */
const generateUniqueSlug = async (text) => {
  let slug = generateSlug(text);
  let exists = await Portfolio.findOne({ slug });
  let counter = 1;

  while (exists) {
    slug = `${generateSlug(text)}-${counter}`;
    exists = await Portfolio.findOne({ slug });
    counter++;
  }

  return slug;
};

module.exports = { generateSlug, generateUniqueSlug };
