export default class CycladeInterface {
    
    #publishedListsOfFeatures = {
        "def": "all the parametres options currently printed on the interface",
        "content": {}
    };
    #publishedOptions = {
        "def": "Lists of options published under selects elements",
        "content": {}
    }
    #selectedDates = {
        "def": "dates already selected by the user",
        "content": {}
    };
    #selectors = {
        "def": "HTML Ids to manipulate the DOM, defined in architecture.json",
        "content": {}
    };
    /******************  Constructeur ******************/
    constructor(selectors) {
        this.#selectors.content = selectors;
    }

    /*********************** CREATE AND MANIPULATE ELEMENTS ON THE INTERFACE ***********************/
    /**
     * Publie une liste de checkboxs dans un élement du DOM défini dans architecture.json
     * Doit recevoir un tableau associatif clé-valeur (id -> nom du champ) 
     * extrafield est là pour pouvoir stocker nos élements par trajectoire pour les modèles
     * @param {object} fields ex : {"PA.SWIO.CMRS.ZF": "PA - ZF", "PA.SWIO.CMRS.minpmer": "PA - minpmer"}
     * @param {string} selectorsId ex: "modeles"
     * @param {string} extrafield ex : "SWIO200920104"
     */
    publishListOfFeaturesToCheck(fields, selectorsId, extrafield = null) {
        //Définir un endroit où stocker les élements en interne dans la classe
        if (typeof (this.#publishedListsOfFeatures[selectorsId]) == 'undefined') {
            this.#publishedListsOfFeatures[selectorsId] = {};
        }

        if (extrafield !== null) {
            if (typeof (this.#publishedListsOfFeatures[selectorsId][extrafield]) == 'undefined') {
                this.#publishedListsOfFeatures[selectorsId][extrafield] = {};
                //on stockera séparément les inputs et l'élément, pour pouvoir à la fois récupérer facilement les actions sur les inputs et pouvoir effacer les élemennts de l'interface 
                this.#publishedListsOfFeatures[selectorsId][extrafield]["input"] = [];
                this.#publishedListsOfFeatures[selectorsId][extrafield]["all"] = [];
            }
        } else {
            this.#publishedListsOfFeatures[selectorsId]["input"] = [];
            this.#publishedListsOfFeatures[selectorsId]["all"] = [];
        }
        //créer un élement checkbox
        let domChecks = [];
        for (let item in fields) {
            let domCheck = this.#createCheckbox(this.#selectors.content[selectorsId].classNameCheck, this.#selectors.content[selectorsId].classNameLabel, item, fields[item]);
            document.getElementById(this.#selectors.content[selectorsId].divId).appendChild(domCheck);
            //cas Modeles
            if (extrafield !== null) {
                this.#publishedListsOfFeatures[selectorsId][extrafield]["input"].push(domCheck.childNodes[1]);
                this.#publishedListsOfFeatures[selectorsId][extrafield]["all"].push(domCheck);
                //cas Params
            } else {
               //pas besoin de champ supplémentaire
                this.#publishedListsOfFeatures[selectorsId]["input"].push(domCheck.childNodes[1]);
                this.#publishedListsOfFeatures[selectorsId]["all"].push(domCheck);
            }
            domChecks.push(domCheck);
        }
        return domChecks;
    }

    /**
     * Quand une liste de checkboxes a déjà été générée, elle est enregistrée dans un tableau et publiable à nouveau via une boucle
     * @param {string} selectorsId 
     * @param {string} extrafield 
     */
    rePublishListOfFeaturesToCheck(selectorsId, extrafield = null) {
        for (let i = 0; i < this.#publishedListsOfFeatures[selectorsId][extrafield]["all"].length; i++) {
            document.getElementById(this.#selectors.content[selectorsId].divId).appendChild(this.#publishedListsOfFeatures[selectorsId][extrafield]["all"][i]);
        }
    }


    /************** Adapt DOM elements **************/
    /**
     * Publie en une phrase sur l'interface les dates de début/fin du système sélecionné, avec son nom
     * @param {array} debutfinnom 
     */
    changeDatesMessage(debutfinnom) {
        let message = document.getElementById(this.#selectors.content.datesinfoid);
        message.classList.remove("elementCache");
        message.textContent = "Dates de " + debutfinnom[0] + " : " + debutfinnom[1] + " - " + debutfinnom[2];
    }

    /**
     * Change le nom de classe de la div qui accueille les graphiques en fonction du nombre de graphiques, pour qu'ils fassent tous la même taille
     * @param {number} nbcharts 
     */
    adaptInterfaceForCharts(nbcharts) {
        const chartsdiv = document.getElementById(this.#selectors.content.chartsid);
        chartsdiv.className = this.#selectors.content.chartsClassNames[nbcharts];
    }
    /**
     * Dans un select, replace l'option dont la valeur est reçue en paramètre comme valeur par défaut
     * @param {any} value 
     * @param {string} id 
     */
    resetOptionsForASelect(value, id){
        var select= document.getElementById(this.#selectors.content[id]);
        for(var i, j = 0; i = select.options[j]; j++) {
            if(i.value == value) {
                select.selectedIndex = j;
                break;
            }
        }
    }
    

    /************** Create DOM elements especially for dates **************/
    /**
     * Crée une liste de dates cliquables, deux méthodes sont envoyées en paramètres : une pour le click sur l'élément et une pour le close
     * @param {object} domElement 
     * @param {string} classNameId correspond à un object dans "selectors" de architecture.json 
     * @param {string} dates 
     * @param {function} treatmentToExecuteOnClick 
     * @param {function} treatmentToExecuteOnClose 
     * @returns DOM element
     */
    createDatesClickablesButtonsList(domElement, classNameId, dates, treatmentToExecuteOnClick, treatmentToExecuteOnClose) {
        let buttonsGroup = document.createElement("div");
        buttonsGroup.setAttribute("class", this.#selectors.content[classNameId]);
        for (let i = 0; i < dates.length; i++) {
            let btn = this.#createAFormatedButtonForADate(dates[i], "dateToSelect");
            let inst = this;
            btn.addEventListener("click", function (event) {
                treatmentToExecuteOnClick(this.value);
                inst.#createAButtonForASelectedDate(this.value, inst.#selectors.content.selectedDateClassName, inst.#selectors.content.selectedDatesParent, treatmentToExecuteOnClose);
            })
            buttonsGroup.appendChild(btn);
        }
        domElement.appendChild(buttonsGroup);
        return buttonsGroup;
    }

    /**
     * Fonction d'ordre supérieur
     * Utilisée pour imprimer les dates sélectionnées dans des boutons. Vérifie si l'élément n'existe pas déjà avant impression. 
     * Inclut un élément "close" auquel une méthode est associée (passée en paramètre)
     * Au clic sur close, l'élément est complètement supprimé
     * @param {string} mydate 
     * @param {string} className 
     * @param {string} parentId 
     * @param {function} somefunction 
     */
    #createAButtonForASelectedDate(mydate, className, parentId, someFunction) {
        if (typeof (this.#selectedDates.content[mydate]) == 'undefined') {
            let btn = this.#createAFormatedButtonForADate(mydate, className);
            let close = this.#createACloseElement();
            btn.appendChild(close);
            let inst = this;
            close.addEventListener("click", function (event) {
                someFunction(btn.value);
                this.parentElement.remove();
                delete inst.#selectedDates.content[mydate];
            });
            document.getElementById(parentId).appendChild(btn);
            this.#selectedDates.content[mydate] = btn;
            return btn;
        }
    }

    /**
     * Crée un bouton par date et le renvoie
     * @param {string} mydate 
     * @param {string} className 
     * @returns DOM element
     */
    #createAFormatedButtonForADate(mydate, className) {
        let btn = document.createElement("button");
        btn.type = "button";
        btn.setAttribute("value", mydate);
        btn.setAttribute("class", className);
        let text = dayjs(mydate).format("MM/DD HH:mm")
        btn.textContent = text;
        return btn;
    }

    /**
     * Crée un élement "close" et le retourne
     * @returns {object} close element
     */
    #createACloseElement() {
        let close = document.createElement("span");
        close.setAttribute("class", "close")
        close.innerHTML = "&times";
        return close;
    }
    /*********************** REMOVE CONTENT FROM THE INTERFACE ***********************/
    
    /**
     * Enlève de l'interface tous les éléments d'un tableau passé en paramètre
     * @param {array} itemsList 
     */
    removeAListOfItemsFromInterface(itemsList) {
        try {
            for (let i in itemsList) {
                itemsList[i].remove();
            }
        } catch {
            console.log("nothing to remove");
        }
    }
    removeOptionsUnderASelect(id) {
        this.removeAListOfItemsFromInterface(this.#publishedOptions.content[id]);
    }
    removeDatesMessage() {
        let message = document.getElementById(this.#selectors.content.datesinfoid);
        message.classList.add("elementCache");
        message.textContent = "";
    }
    /**
     * Uncheck all the elements from a list of features
     * @param {*} itemsList 
     */
     #uncheckAListOfInputs(inputs){
        for (let i=0; i<inputs.length; i++){
            inputs[i].checked = false;
        }
    }

    /**
     * Dépublier une liste de checkboxes créée et mettre l'attribut "checked" sur false
     * avoir les deux paramètres me permet de savoir comment retrouver les checkboxes, mais avoir le bon nom pour le second paramètre n'est pas nécessaire
     * @param {string} selectorsId 
     * @param {string} extrafield 
     */

    removeListOfFeaturesToCheck(selectorsId, extrafield = null) {
        try {
            if (typeof (this.#publishedListsOfFeatures[selectorsId]) !== 'undefined') {
                if (extrafield !== null) {
                    //utilisé pour enlever les choix de modèles
                    //vérifier qu'il y ait du contenu d'imprimé

                    if (Object.keys(this.#publishedListsOfFeatures[selectorsId]).length !== 0) {
                        //if there are, remove each one of them
                        for (let oneOption in this.#publishedListsOfFeatures[selectorsId]) {
                            this.removeAListOfItemsFromInterface(this.#publishedListsOfFeatures[selectorsId][oneOption].all);
                            for (let i = 0; i < this.#publishedListsOfFeatures[selectorsId][oneOption].all.length; i++) {
                                this.#uncheckAListOfInputs(this.#publishedListsOfFeatures[selectorsId][oneOption].input); 
                                this.#publishedListsOfFeatures[selectorsId][oneOption].all[i].remove();
                            }
                        }
                    }
                    //remove parameters if needed
                } else if (this.#publishedListsOfFeatures[selectorsId].length !== 0) {
                    //if there are, remove each one of them
                    for (let i = 0; i < this.#publishedListsOfFeatures[selectorsId].all.length; i++) {
                        this.#uncheckAListOfInputs(this.#publishedListsOfFeatures[selectorsId].input);
                        this.#publishedListsOfFeatures[selectorsId].all[i].remove();
                    }
                }
            }
        } catch {
            console.log("no checkboxes to remove");
        }
    }

    /**
     * Les dates sélectionnées sont supprimées de l'interface et de la mémoire
     */
    eraseSelectedDates() {
        this.removeAListOfItemsFromInterface(this.#selectedDates.content);
        this.#selectedDates.content = {};
    }

    /*********************** CHECK IF ELEMENT ALREADY EXISTS ***********************/
    /**
     * vérifier si une liste de checkboxes a déjà été publiée
     * @param {string} id 
     * @param {string} extrafield 
     * @returns {boolean}
     */
    checkIfListOfInputsExists(id, extrafield) {
        if (typeof (this.#publishedListsOfFeatures[id]) == 'undefined') {
            return false;
        }
        if (typeof (this.#publishedListsOfFeatures[id][extrafield]) == 'undefined') {
            return false;
        } else {
            return true;
        }
    }
    /**
     * renvoie la valeur d'un élément de DOM si cet élément existe, false sinon
     * @param {object} domElementValue 
     * @param {function} afunction 
     * @returns 
     */
    #returnValueIfSet(domElementValue, afunction = null) {
        if (domElementValue.length !== 0) {
            if (afunction) {
                return afunction(domElementValue);
            } else {
                return domElementValue;
            }
        } else {
            return false;
        }
    }
    /*********************** ACCESS TO WHAT IS ASKED FROM THE INTERFACE ***********************/

    /**
     * Toutes ces focntions renvoient les valeurs des inputs de l'interface.
     */
    getBassin() {
        return this.#returnValueIfSet(document.getElementById(this.#selectors.content.bassinselectid).value);
    }

    getSaison() {
        return this.#returnValueIfSet(document.getElementById(this.#selectors.content.saisonselectid).value);
    }
    /**
     * @returns {number} even if the option value is string
     */
    getTraj() {
        const treatmentToExecute = function (param) {
            return parseInt(param);
        };
        return this.#returnValueIfSet(document.getElementById(this.#selectors.content.trajectoireselectid).value, treatmentToExecute);
    }
    getBassinSaisonTraj() {
        let bassin = this.getBassin();
        let saison = this.getSaison();
        let traj = this.getTraj();

        if ((bassin == false) || (saison == false) || (traj == false)) {
            return false;
        } else {
            return (bassin + saison + traj);
        }
    }
    /**
     * Renvoie un tableau d'inputs
     * @param {string} id 
     * @param {string} extrafield 
     * @returns {array}
     */
    getInputsFromAListOfFeatures(id, extrafield = null) {
        try {
            if (this.checkIfListOfInputsExists(id, extrafield)) {
                if (extrafield !== null) {
                    var myinputsarray = this.#publishedListsOfFeatures[id][extrafield]["input"];
                } else {
                    var myinputsarray = this.#publishedListsOfFeatures[id]["input"];
                }
                var result = [];
                for (let i = 0; i < myinputsarray.length; i++) {
                    result.push(myinputsarray[i]);
                }
                return result;
            }
        } catch {
            console.log("problème sur la liste de checkboxes");
        }
    }

    /**
     * Renvoie un tableau avec toutes les valeurs des champs cochés en interface
     * Ces champs doivent avoir été créés avec publishListOfFeaturesToCheck(fields, selectorsId)
     * @param {string} id 
     * @param {string} extrafield 
     * @returns {array}
     */
    getCheckedFromListOfFeatures(id, extrafield = null) {
        if (typeof (this.#publishedListsOfFeatures[id]) !== 'undefined') {
            if (extrafield !== null) {
                if (typeof (this.#publishedListsOfFeatures[id][extrafield]) !== 'undefined') {
                    var myinputsarray = this.#publishedListsOfFeatures[id][extrafield]["input"];
                } else {
                    return false;
                }
            } else {
                var myinputsarray = this.#publishedListsOfFeatures[id]["input"];
            }

            var result = [];
            for (let i = 0; i < myinputsarray.length; i++) {
                if (myinputsarray[i].checked) {
                    result.push(myinputsarray[i].value);
                }
            }
            return result;
        } else {
            return false;
        }
    }
    /**
     * Renvoie la valeur de tous les éléments qui ont selected-date comme nom de classe
     * @returns {array}
     */
    getSelectedDates() {
        let datesDOM = document.getElementsByClassName(this.#selectors.content.selectedDateClassName);
        if (Object.keys(datesDOM).length !== 0) {
            let dates = [];
            for (let i = 0; i < datesDOM.length; i++) {
                dates.push(datesDOM[i].value);
            }
            return dates;
        } else {
            return false;
        }
    }

    /************** Create simple DOM elements **************/
    /**
     * Créer une nouvelle proposition dans une liste "select"
     * @param {string} field 
     * @param {any} value 
     * @param {string} id 
     */
    createOptionForASelect(field, value, id) {
        if (!this.#publishedOptions.content[id]) {
            this.#publishedOptions.content[id] = [];
        }
        let domOption = this.#createOption(field, value);
        document.getElementById(this.#selectors.content[id]).appendChild(domOption);
        this.#publishedOptions.content[id].push(domOption);
    }
    /**
     * Crée et rend l' "option" en elle-même
     * @param {string} text 
     * @param {any} value 
     * @returns {object}
     */
    #createOption(text, value) {
        let option = document.createElement("option");
        option.text = text;
        option.value = value;
        return option;
    }

    /**
     * Crée une checkbox personnalisée. L'input check en lui-même est caché, et complété par un élément span accessible par le nom de classe "checkmark"
     * @param {string} classNameCheck 
     * @param {string} classNameLabel 
     * @param {string} fieldValue 
     * @param {string} fieldName 
     * @returns DOM element
     */
    #createCheckbox(classNameCheck, classNameLabel, fieldValue, fieldName) {
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = fieldValue;
        checkbox.value = fieldValue;
        checkbox.setAttribute("class", classNameCheck);
        let label = document.createElement('label');
        label.htmlFor = fieldValue;
        label.setAttribute("class", classNameLabel);
        let checkMark = document.createElement('span');
        checkMark.setAttribute("class", "checkmark");
        let nom = document.createTextNode(fieldName);
        label.appendChild(nom);
        label.appendChild(checkbox);
        label.appendChild(checkMark);
        return label;
    }
}