export default class CycladeGraphRoot {
      
    #root = {
        "def": "Contains all the graph",
        "content": {},
        "divId": ""
    }
    #rootParams = {
        "def": "Settings for the graph root, from graph config",
        "content": null
    };
    #xAxis = {
        "def": "x_axis on the graph",
        "content": null
    }
    #y_axis = {
        "def": "differents parametres on Yfields, here only one is suported",
        "content": {
            yFieldsNames: [], //noms des axes Y
            yAxisUnits: [], //unités
            yFieldsIds: [], //id du modèle, depuis config_graph 
            yRenderer: null //ce qui est imprimé
        }
    };
    #chart = {
        "def": "contains the chart itself",
        "content": {}
    };
    #cursor = {
        "def": "objet curseur d'amCharts",
        "content": {}
    };
    #serieToLinkWithMap = {
        "def": "Serie on wich a connexion will be set with the graph",
        "content": {}
    };
    #printedWind = {
        "def": "one wind polygon printed on the map",
        "content": null
    }
    #map = null;
    #legend = {
        "def": "supports the legend of a chart and stores the div's legend id",
        "content": {
            "divId": null,
            "legendRoot": {}
        }
    };

    constructor(rootParams, divId, map = null) {
        this.#rootParams.content = rootParams;
        this.#root.divId = divId[0];
        this.#legend.content.divId = divId[1];
        this.#map = map;
    }

    /**
     * Vider le graphique, la légende, les variables qui contenaient des informations relatives aux graphiques imprimés précédemment
     */

    clearGraph() {
        //on vérifie si il y a déjà un graph avant d'essayer de l'effacer
        if (Object.keys(this.#root.content).length !== 0) {
            //On doit "vider" la racine du graph pour pouvoir y afficher des données, si il y en a déjà. 
            this.#root.content.dispose();
            //Pareil avec la racine de la légende
            this.#legend.content.legendRoot.dispose();
            this.#y_axis.content = {
                yFieldsNames: [],
                yAxisUnits: [],
                yFieldsIds: [],
                yRenderer: null
            };
            this.#printedWind.content = null;
        }
    }
    /**
     * Imprimer un graphique
     * @param {array} yParam tableau d'ids de champs
     * @param {array} allModelsDatas tableau d'objets
     */
    createAGraph(yParam, allModelsDatas) {
        this.clearGraph();

        /*****ROOT *******/
        //placement du graph dans la div prévue
        this.#root.content = am5.Root.new(this.#root.divId);

        //formatage de la date pour la bulle d'info qui suit la souris
        if (this.#rootParams.content.style.date_format_tooltip) {
            this.#root.content.dateFormatter.setAll({
                dateFormat: this.#rootParams.content.style.date_format_tooltip,
                dateFields: ["date"]
            });
        }
        // Thème basique
        // https://www.amcharts.com/docs/v5/concepts/themes/ 
        this.#root.content.setThemes([
            am5themes_Animated.new(this.#root.content)
        ]);

        /*****CHART*******/
        // Création de l'emplacement du graph
        // https://www.amcharts.com/docs/v5/charts/xy-chart/
        this.#chart.content = this.#root.content.container.children.push(am5xy.XYChart.new(this.#root.content, {
            panX: true, //pan = pouvoir maintenir le clic enfoncé pour bouger la chart
            panY: true,
            wheelX: "zoomY",
            wheelY: "zoomX", //comportement à la roulette de la souris https://www.amcharts.com/docs/v5/charts/xy-chart/zoom-and-pan/Mouse_wheel_behavior
            maxTooltipDistance: 0
        }));

        /****Date Axis ****/
        this.#createXaxis();

        /****Y Axis *****/
        this.#prepareYparameters(yParam);
        for (let key = 0; key < this.#y_axis.content.yFieldsNames.length; key++) {
            var yAxis = this.#getYaxis(false);
            this.#createSeries(this.#y_axis.content.yFieldsNames[key], this.#y_axis.content.yFieldsIds[key], allModelsDatas, yAxis);
        }

        /***Cursor ***/
        // Ajouter un curseur, un objet amcharts
        this.#cursor.content = this.#chart.content.set("cursor", am5xy.XYCursor.new(this.#root.content, {
            xAxis: this.#xAxis.content,
            behavior: "none"
        }));

        //Créer un trait entre la position du curseur et l'axe des Y         
        this.#cursor.content.lineY.set("visible", this.#rootParams.content.style.cursor_on_y);


        /**
         * Ajout d'une légende dans un container à part pour ne pas que sa taille impacte la taille du graphique
         * doc : https://www.amcharts.com/docs/v5/concepts/legend/#external-container
         * + doc : https://www.amcharts.com/docs/v5/concepts/themes/#default-themes
         */

        this.#legend.content.legendRoot = am5.Root.new(this.#legend.content.divId);
        this.#legend.content.legendRoot.setThemes([
            am5themes_Animated.new(this.#legend.content.legendRoot),
            am5xy.DefaultTheme.new(this.#legend.content.legendRoot)
        ]);

        //Taille de la légende
        var legend = this.#legend.content.legendRoot.container.children.push(
            am5.Legend.new(this.#legend.content.legendRoot, {
                width: am5.percent(100),
                centerX: am5.percent(50),
                x: am5.percent(50),
            })
        );

        //mettre des courbes en évidence au survol de la légende
        this.#animateLegend(this, legend);
        legend.data.setAll(this.#chart.content.series.values);

        this.#chart.content.appear(1000, 100);

        //Connecter le graph à la carte si il y a au moins un objet qui a des données à afficher sur carte 
        if (Object.keys(this.#serieToLinkWithMap.content).length !== 0) {
            this.#linkGraphAndMap(this.#cursor.content, this.#xAxis.content);
        };

        //Titrer le graphique
        let title = this.#prepareTitle(allModelsDatas);
        let chartTitle = this.#chart.content.topAxesContainer.children.push(am5.Label.new(this.#root.content, {
            text: title,
            marginTop: 0,
            paddingTop: 2
        }));
    }
    /**
     * Créer l'axe des X, qui est forcément un axe de dates dans cette version
     */
    #createXaxis() {

        this.#xAxis.content = this.#chart.content.xAxes.push(
            am5xy.DateAxis.new(this.#root.content, {
                maxDeviation: 0.2, //https://www.amcharts.com/docs/v5/charts/xy-chart/zoom-and-pan/Over_zooming
                groupData: true, //"lisser" les données en les groupant quand on dézomme.
                baseInterval: this.#rootParams.content.baseInterval, //intervalle de temps entre deux data
                tooltipDateFormat: this.#rootParams.content.style.date_format_tooltip, //Format date infobulle
                renderer: am5xy.AxisRendererX.new(this.#root.content, {}),
                tooltip: am5.Tooltip.new(this.#root.content, {})
            })
        );
        //quadrillage
        if (this.#rootParams.content.style.gridIntervals) {
            this.#xAxis.content.set("gridIntervals", this.#rootParams.content.style.gridIntervals);
        }

        //Format d'affichage des dates sur l'axe des X en fonction du zoom
        this.#xAxis.content.get("dateFormats")["hour"] = "MMM d, yyyy";
        this.#xAxis.content.get("dateFormats")["day"] = "MMM d, yyyy";
    }

    /**
     * Pour chacun des ids de diagnostics reçus dans un tableau, ajuste la variable global #y_axis
     * Les réglages doivent avoir éé fait dans le fichier de configuration du graphique
     * @param {array} yParam 
     */
    #prepareYparameters(yParam) {
        let yfields_list = this.#rootParams.content.paramsFields;
        for (let field = 0; field < yParam.length; field++) {

            //on récupère les noms des données à afficher dans une variable globale
            let paramId = yParam[field];
            this.#y_axis.content.yFieldsIds.push(paramId);
            this.#y_axis.content.yFieldsNames.push(yfields_list[paramId]["name"]);
            this.#y_axis.content.yAxisUnits.push(yfields_list[paramId]["unit"]);
        }
    }

    /**
     * Dans cette version, le booléen est forcément false. 
     * Préparer un objet yAxis, qui est forcément un axe de valeurs
     * @param {boolean} opposite 
     * @returns {object}
     */
    #getYaxis(opposite) {

        let yRenderer = am5xy.AxisRendererY.new(this.#root.content, {
            opposite: opposite
        });
        yRenderer.grid.template.set("strokeOpacity", 0.04); //opacité des lignes du grid
        this.#y_axis.content.yRenderer = yRenderer;

        //style
        let yAxis = this.#chart.content.yAxes.push(
            am5xy.ValueAxis.new(this.#root.content, {
                maxDeviation: 0.1,
                renderer: yRenderer,
            })
        );

        //infobulle
        if (this.#rootParams.content.style.cursor_on_y) {
            yAxis.set("tooltip", am5.Tooltip.new(this.#root.content, {}));
        }

        //si il y a déjà un axe Y, les deux vont synchroniser leurs échelles
        //https://www.amcharts.com/docs/v5/charts/xy-chart/axes/value-axis/Syncing_grid
        if (this.#chart.content.yAxes.indexOf(yAxis) > 0) {
            yAxis.set("syncWithAxis", this.#chart.content.yAxes.getIndex(0));
        }

        return yAxis;
    }
    /**
     * Souris sur un intitulé de légende : la courbe se met en évidence
     * @param {*} inst 
     * @param {*} legend 
     */
    #animateLegend(inst, legend) {
        //Quand une légende est en survol, elle est mise en évidence et toutes les autres se grisent
        legend.itemContainers.template.events.on("pointerover", function (e) {
            var itemContainer = e.target;
            // dataContext = series de données
            var series = itemContainer.dataItem.dataContext;
            inst.#chart.content.series.each(function (chartSeries) {
                if (chartSeries != series) {
                    chartSeries.strokes.template.setAll({
                        strokeOpacity: 0.15,
                        stroke: am5.color(0x000000)
                    });
                } else {
                    chartSeries.strokes.template.setAll({
                        strokeWidth: 3
                    });
                }
            })
        })

        // Sinon, laisser toutes les courbes telles quelles
        legend.itemContainers.template.events.on("pointerout", function (e) {
            inst.#chart.content.series.each(function (chartSeries) {
                chartSeries.strokes.template.setAll({
                    strokeOpacity: 1,
                    strokeWidth: 1,
                    stroke: chartSeries.get("fill")
                });
            });
        })

        legend.itemContainers.template.set("width", am5.p80);
        legend.valueLabels.template.setAll({
            width: am5.p70,
            textAlign: "left"
        });
    }
    /**
     * Crée une courbe pour un axe Y donné. Forcément X = axe de dates, et Y = axe de valeurs
     * @param {string} yfieldname 
     * @param {string} fieldId 
     * @param {array} allModelsDatas 
     * @param {object} yAxis 
     */
    #createSeries(yfieldname, fieldId, allModelsDatas, yAxis) {

        /*************************SERIES **************************/
        // Ajouter la courbe
        for (let i = 0; i < allModelsDatas.length; i++) {
            let oneModelData = allModelsDatas[i];
            //prépare le nom de la courbe
            let namedata = this.#prepareLegend(oneModelData.name, yfieldname, allModelsDatas.length);
            //générer la donnée
            let series = this.#chart.content.series.push(
                am5xy.LineSeries.new(this.#root.content, {
                    xAxis: this.#xAxis.content,
                    yAxis: yAxis,
                    name: namedata,
                    valueYField: "value",
                    valueXField: "date",
                    //donnée affichée dans la légende au parcours du graph
                    legendValueText: " {valueY}",
                    connect: this.#rootParams.content.style.lines_connect,
                    tooltip: am5.Tooltip.new(this.#root.content, {
                        pointerOrientation: "horizontal",
                        //contenu de l'infobulle
                        labelText: "[bold]{name} : [/]{valueY}"
                    })
                })
            );

            //Couleur définie par l'objet qui porte la donnée, pour être identique à celle de la carte
            series.set("stroke", am5.color(oneModelData.color));
            series.set("fill", am5.color(oneModelData.color));

            //insérer la donnée dans le graphique 
            series.data.setAll(oneModelData.datas[fieldId]);

            //épaisseur des lignes sur les courbes
            series.strokes.template.setAll({
                strokeWidth: 1
            });


            // coquetterie //lignes pleines à l'extérieur, le long de l'axe des Y
            this.#y_axis.content.yRenderer.setAll({
                stroke: series.get("fill"),
                strokeOpacity: 1,
                opacity: 1
            });
            let inst = this;

            //gestion de l'épaisseur du trait sur la courbe
            if (this.#rootParams.content.style.main_lines_thickness) {
                series.strokes.template.setAll({
                    strokeWidth: inst.#rootParams.content.style.main_lines_thickness,
                    strokeDasharray: oneModelData.dashArray
                });
            }
            /******* Plusieurs tests de style en accord avec les réglages de config_charts  *******/

            //chaque data marquée d'un point sur le graphique ? 
            if (this.#rootParams.content.style.series_bullets) {
                series.bullets.push(function () {
                    return am5.Bullet.new(inst.#root.content, {
                        sprite: am5.Circle.new(inst.#root.content, {
                            radius: inst.#rootParams.content.style.series_bullets, //taille des bulles
                            fill: series.get("fill")
                        })
                    });
                });
            }

            //remplissage entre la courbe et l'axe x ? 
            if (this.#rootParams.content.style.series_fill) {
                series.fills.template.setAll({
                    fillOpacity: 0.5,
                    visible: true
                });
            }
            // Connection courbe-carte si l'objet a des données à afficher sur carte 
            if (oneModelData.popup) {
                //enregistrement des données à afficher dans un variable globale, donc possible que pour 1 objet
                this.#serieToLinkWithMap.content["series"] = series;
                this.#serieToLinkWithMap.content["popup"] = oneModelData.popup;

            };
            if (oneModelData.wind) {
                this.#serieToLinkWithMap.content["series"] = series;
                this.#serieToLinkWithMap.content["wind"] = oneModelData.wind;
            }
            //Un peu d'animation au chargement
            series.appear();
        }
    }

    #prepareTitle(trajs) {
        let title = ""
        //si il y a seulement un paramètre envoyé, ce paramètre devient le titre du graphique avec l'unité 
        for (let i = 0; i < this.#y_axis.content.yFieldsNames.length; i++) {
            title += " " + this.#y_axis.content.yFieldsNames[i] + " (" + this.#y_axis.content.yAxisUnits[i] + "),";
        }
        title = title.substring(0, title.length - 1);
        //si il n'y a qu'une seule courbe, son nom est ajouté
        if (trajs.length < 2) {
            title += " sur " + trajs[0]["name"];
        }
        return title;
    }

    #prepareLegend(trajName, yfieldname, nbTrajs) {
        let oneLegend = "";
        //Si il y a plusieurs courbes, le nom de la courbe est noté en légende
        if (nbTrajs > 1) {
            oneLegend = trajName;
        } else {
            //Sinon, c'est le nom du diagnostic
            oneLegend = yfieldname;
        }
        return oneLegend;
    }
    /**
     * Récupère la position du curseur selon l'axe des x, la convertir en timestamp, 
     * regarde si il existe une popup ou un rayon de vent à imprimer sur la carte pour cette date 
     * @param {object} cursor 
     * @param {object} xAxis 
     */
    #linkGraphAndMap(cursor, xAxis) {
        if (this.#map !== null) {
            let inst = this;
            cursor.events.on("cursormoved", function (ev) {
                //récupérer la position du curseur
                let posx = ev.target.getPrivate("positionX");
                //bien la récupérer malgré le zoom
                let x = xAxis.toAxisPosition(posx);
                //transformation en date
                let dateX = xAxis.positionToDate(x);
                //on enlève environ une heure de précision
                let indice = ((new Date(dateX).getTime()) / 10000000).toFixed();
                //look if there are popups and/or wind to "connect" to the graph
                if (Object.keys(inst.#serieToLinkWithMap.content).length !== 0) {
                    if (inst.#serieToLinkWithMap.content.popup) {
                        if (inst.#serieToLinkWithMap.content.popup[indice]) {
                            inst.#serieToLinkWithMap.content.popup[indice].openPopup();
                        }
                    }
                    if (inst.#serieToLinkWithMap.content.wind) {
                        inst.removeWindFromMap(inst);
                        if (inst.#serieToLinkWithMap.content.wind[indice]) {
                            inst.#printedWind.content = inst.#serieToLinkWithMap.content.wind[indice];
                            inst.#printedWind.content.addTo(inst.#map);
                        }
                    }
                }
                //     else {
                //         console.log("générer une pop up avec ça ???");
                //         let item = xAxis.getSeriesItem(inst.serieToLinkWithMap.content.series, x);
                //         console.log(item.dataContext);
                //    }
            });
        } else {
            console.log("Pas de carte associée à ce graphique");
        }

    }
    /**
     * Enlève la dernière "couche de vent" imprimée sur la carte
     */
    removeWindFromMap(inst) {
        if (typeof (inst.#printedWind.content) !== 'undefined') {
            if (inst.#printedWind.content !== null) {
                inst.#printedWind.content.remove();
            }
        }
    }
}