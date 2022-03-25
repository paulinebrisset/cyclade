export default class CycladeUtils {

    /***************************** GENERAL FUNCTIONS ***************************/
    /**
     * Enregistrer des données de fichiers JSON dans des variables lisibles par JavaScript
     * @param {string} json_file adresse du fichiers
     * @param {boolean} sync_mode synchrone ou asynchrone
     * @returns {object}
     */
    read_json(json_file, sync_mode) {
        let result;
        $.ajaxSetup({
            async: sync_mode
        });
        $.getJSON(json_file, function (data) {
            result = data;
        }).fail(function () {
            console.log("Error reading " + json_file);
        })
        $.ajaxSetup({
            async: true
        });
        return result;
    }
    
    /**
     * Dans les json de configuration il y a en string le chemin d'accès aux propriétés à obtenir
     * On ne peut pas les faire appliquer dans un array si il y a plusieurs niveaux (ex : feature[geometry.coordinates.0])
     * cette fonction recompose le chemin, à partir d'un objet (qu'on doit appeler feature dans la fonction qui appelle celle-ci) 
     * @param {string} field 
     * @returns {string}: un "eval()" dessus permet de lire les propriétés de l'objet
     */
    readStringPath(field) {
        let splitfield = field.split('.'); 
        let mypath = "feature[\"";
        for (let e = 0; e < (splitfield.length); e++) {
            mypath += splitfield[e] + "\"][\"";
        }
        mypath = mypath.substring(0, mypath.length - 2);
        return mypath;
    }
}