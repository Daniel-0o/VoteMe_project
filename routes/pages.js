var express = require('express');
var router = express.Router();
var path = require('path');

router.get('/:folder/:page', (req, res, next) => {
    const folder = req.params.folder;
    const page = req.params.page;

    const viewPath = path.join(folder, page);

    res.render(viewPath, {
        title: page.charAt(0).toUpperCase() + page.slice(1)
    });
});

router.get('/:page', (req, res, next) => {
    const page = req.params.page;

    res.render(page, {
        title: page.charAt(0).toUpperCase() + page.slice(1)
    });
});

module.exports = router;
