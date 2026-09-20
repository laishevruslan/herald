const today = new Date();

function isNew(element) {
    if (!element['creation_date']) return false;
    const date = new Date(element['creation_date'] + 'Z');
    const nbDays = (today - date) / (1000 * 60 * 60 * 24);
    return nbDays < 7;
}

function sortDatedElementsFunction(a, b) {
    if (a['creation_date'] && !b['creation_date']) return -1;
    if (!a['creation_date'] && b['creation_date']) return +1;
    if (a['creation_date'] === b['creation_date']) return a['id'] < b['id'];
    return a['creation_date'] < b['creation_date'];
}

function mapElements(elements) {
    elements = elements.map((element) => {
        if (Array.isArray(element)) return element;
        return {
            ...element,
            isNew: isNew(element),
        };
    });
    elements = elements.sort(sortDatedElementsFunction);
    return elements;
}

function computeNbModifiedElements(elements) {
    let nbNew = 0;
    elements.forEach((element) => (nbNew += element['status'] === 'modified' || element['status'] === 'added' || element['status'] === 'deleted'));
    return nbNew;
}

function computeNbNewElements(elements) {
    let nbNew = 0;
    elements.forEach((element) => (nbNew += element['isNew'] == true));
    return nbNew;
}

function checkCategory(category) {
    if (category !== 'images' && category !== 'backgrounds' && category !== 'templates') throw Error(`Not implemented category ${category}`);
}

export { isNew, mapElements, computeNbModifiedElements, computeNbNewElements, checkCategory, sortDatedElementsFunction };
