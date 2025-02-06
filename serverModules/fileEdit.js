const fs = require("fs");
const conflictDelimiterRegex = /<<<<<<< HEAD[\s\S]*?>>>>>>> [\w-]+/g;
const recursiveFuzzyIndexOf = require("./fuzzySearch");

const expandToFullLines = (fileContent, startIndex, endIndex) => {
  while (startIndex > 0 && fileContent[startIndex - 1] !== "\n") {
    startIndex--;
  }
  while (endIndex < fileContent.length && fileContent[endIndex] !== "\n") {
    endIndex++;
  }
  return { startIndex, endIndex };
};

const parseConflicts = (conflictText) => {
  const conflicts = conflictText.match(conflictDelimiterRegex) || [];
  return conflicts.map((conflict) => {
    const parts = conflict.split("=======");
    const originalText = parts[0].replace(/<<<<<<< HEAD\n/, "");
    const replacementText = parts[1].replace(/\n>>>>>>> [\w-]+/, "");
    return { originalText, replacementText };
  });
};

const applyReplacements = async (fileContent, replacements) => {
  let originalContent = fileContent;
  let unsuccessfulReplacements = [];
  let fuzzyReplacements = [];

  replacements.forEach(({ originalText, replacementText }) => {
    if (!originalText) originalText = "";

    let occurrences = [];
    let index = fileContent.indexOf(originalText);

    while (index !== -1 && index < fileContent.length) {
      occurrences.push(index);
      const newIndex = fileContent.indexOf(originalText, index);
      index = newIndex === -1 ? -1 : Math.max(index + 1, newIndex);
    }

    let startIndex = fileContent.indexOf(originalText);
    let endIndex = startIndex + originalText.length;

    const startCounts = fileContent.split(originalText).length - 1;

    if (originalText !== "" && startCounts > 1) {
      let linesAroundOccurrences = occurrences.map((startIndex, i) => {
        const surroundingText = extractLinesAroundOccurrence(fileContent, startIndex, startIndex + originalText.length);
        let lineStart = fileContent.lastIndexOf("\n", startIndex) + 1;
        let lineNumber = fileContent.substring(0, lineStart).split("\n").length;
        const numberedLines = surroundingText.split("\n").map((line, idx) => `${lineNumber + idx}: ${line}`).join("\n");
        return `Occurrence ${i + 1}:\n${numberedLines}`;
      });

      unsuccessfulReplacements.push(
        `Multiple occurrences found for text: '${originalText}' (${startCounts} times). Lines:\n${linesAroundOccurrences.join("\n---\n")}`
      );
      return;
    } else if (startIndex < 0) {
      const fuzzyResult = recursiveFuzzyIndexOf(fileContent, originalText);
      if (fuzzyResult.distance / originalText.length < 0.3) {
        fuzzyReplacements.push(`Fuzzy replacement, searched for '${originalText}', found '${fuzzyResult.value}'`);
        fileContent =
          fileContent.substring(0, fuzzyResult.start) + replacementText + fileContent.substring(fuzzyResult.end);
      } else {
        unsuccessfulReplacements.push(
          `Text not found: '${originalText}'\nClosest match (${fuzzyResult.distance} symbols away): ${fuzzyResult.value}`
        );
      }
      return;
    }

    fileContent = fileContent.substring(0, startIndex) + replacementText + fileContent.substring(endIndex);
  });

  return {
    updatedContent: fileContent.replace(/\\n/g, "\n").replace(/\\t/g, "\t"),
    unsuccessfulReplacements,
    fuzzyReplacements,
    originalContent,
  };
};

const mergeText = async (fileContent, replacements) => {
  if (replacements.length > 0) {
    return await applyReplacements(fileContent, replacements);
  } else {
    return {
      updatedContent: fileContent.replace(/\\n/g, "\n").replace(/\\t/g, "\t"),
      unsuccessfulReplacements: [],
      fuzzyReplacements: [],
      originalContent: fileContent,
    };
  }
};

const extractLinesAroundOccurrence = (fileContent, startIndex, endIndex, numSurroundingLines = 2) => {
  let startLineBreak = startIndex;
  let endLineBreak = endIndex;

  for (let i = 0; i < numSurroundingLines; i++) {
    startLineBreak = fileContent.lastIndexOf("\n", startLineBreak - 1);
    if (startLineBreak === -1) break;
  }

  for (let i = 0; i < numSurroundingLines; i++) {
    endLineBreak = fileContent.indexOf("\n", endLineBreak + 1);
    if (endLineBreak === -1) break;
  }

  return fileContent.substring(startLineBreak + 1, endLineBreak + 1);
};

module.exports = {
  applyReplacements,
  mergeText,
  parseConflicts,
};
