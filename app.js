(function() {
    const drawGraphs = function () {
        d3.selectAll('.you-draw-it').each(function () {
            const sel = d3.select(this);
            const key = this.dataset.key;
            const question = window.ydi_data[key];
            const indexedData = question.data;
            const data = Object.keys(indexedData).map(key => {
                return {
                    year: Number(key),
                    value: indexedData[key]
                }
            });

            if (data.length < 1) {
                console.log("No data available for:", key);
                return;
            }

            const isMobile = window.innerWidth < 760;

            const minYear = data[0].year;
            const maxYear = data[data.length - 1].year;
            const periods = [
                {year: 2010, class: 'black', title: "Amtszeit\nJürgen Rüttgers"},
                {year: 2012, class: 'red', title: "1. Amtszeit\nHannelore Kraft"},
                {year: Math.min(2017, maxYear), class: 'red', title: "2. Amtszeit\nHannelore Kraft"}
            ];
            const medianYear = periods[periods.length - 2].year;
            const minY = d3.min(data, d => d.value);
            const maxY = d3.max(data, d => d.value);
            const segmentBorders = [minYear].concat(periods.map(d => d.year));

            const ƒ = function () {
                const functions = arguments;

                //convert all string arguments into field accessors
                for (let i = 0; i < functions.length; i++) {
                    if (typeof(functions[i]) === 'string' || typeof(functions[i]) === 'number') {
                        functions[i] = (str => function (d) {
                            return d[str];
                        })(functions[i]);
                    }
                }

                //return composition of functions
                return function (d) {
                    let i = 0, l = functions.length;
                    while (i++ < l) d = functions[i - 1].call(this, d);
                    return d
                }
            };

            const drawAxis = function (c) {
                c.axis.attr("class", "x axis")
                    .attr("transform", "translate(0," + c.height + ")")
                    .call(c.xAxis);
            };

            const makeLabel = function (pos, addClass) {
                const x = c.x(pos);
                const y = c.y(indexedData[pos]);
                const data = question.precision ? Number(indexedData[pos]).toFixed(question.precision) : indexedData[pos];
                const text = String(data).replace('.', ',') + (question.unit ? ' ' + question.unit : '');

                const label = c.labels.append('div')
                    .classed('data-label', true)
                    .classed(addClass, true)
                    .style('left', x + 'px')
                    .style('top', y + 'px');
                label.append('span')
                    .text(text);

                if (pos == minYear && isMobile) {
                    label.classed('edge-left', true);
                }
                if (pos == maxYear && isMobile) {
                    label.classed('edge-right', true);
                }

                return [
                    c.dots.append('circle')
                        .attr('r', 4.5)
                        .attr('cx', x)
                        .attr('cy', y)
                        .attr('class', addClass),
                    label
                ];
            };

            const drawChart = function (lower, upper, addClass) {
                const definedFn = (d, i) => d.year >= lower && d.year <= upper;
                const area = d3.area().x(ƒ('year', c.x)).y0(ƒ('value', c.y)).y1(c.height).defined(definedFn);
                const line = d3.area().x(ƒ('year', c.x)).y(ƒ('value', c.y)).defined(definedFn);

                if (lower == minYear) {
                    makeLabel(minYear, addClass);
                }
                const svgClass = addClass + (upper == medianYear ? " median" : '');

                const group = c.charts.append('g');
                group.append('path').attr('d', area(data)).attr('class', 'area ' + svgClass).attr('fill', `url(#gradient-${addClass})`);
                group.append('path').attr('d', line(data)).attr('class', 'line ' + svgClass);

                return [
                    group,
                ].concat(makeLabel(upper, addClass));
            };

            const clamp = function (a, b, c) {
                return Math.max(a, Math.min(b, c))
            };

            // make visual area empty
            sel.html('');

            const margin = {
                top: 20,
                right: isMobile ? 20 : 50,
                bottom: 20,
                left: isMobile ? 20 : 50
            };
            const width = sel.node().offsetWidth;
            const height = 400;
            const c = {
                width: width - (margin.left + margin.right),
                height: height - (margin.top + margin.bottom)
            };

            // configure scales
            const graphMinY = Math.min(minY, 0);
            const graphMaxY = Math.max(indexedData[medianYear] * 2, maxY + (maxY - graphMinY) * 0.4); // add 40% for segment titles
            c.x = d3.scaleLinear().range([0, c.width]);
            c.x.domain([minYear, maxYear]);
            c.y = d3.scaleLinear().range([c.height, 0]);
            c.y.domain([graphMinY, graphMaxY]);

            c.svg = sel.append('svg')
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                .attr("width", c.width)
                .attr("height", c.height);

            // gradients
            c.defs = d3.select(c.svg.node().parentNode).append('defs');
            ['black', 'red'].forEach(color => {
                const gradient = c.defs.append('linearGradient')
                    .attr('id', 'gradient-' + color)
                    .attr('x1', '0%')
                    .attr('y1', '0%')
                    .attr('x2', '0%')
                    .attr('y2', '100%');
                gradient.append('stop').attr('offset', '0%').attr('class', 'start');
                gradient.append('stop').attr('offset', '100%').attr('class', 'end');
            });
            c.defs.append('marker')
                .attr('id', 'preview-arrow')
                .attr('orient', 'auto')
                .attr('markerWidth', 2)
                .attr('markerHeight', 4)
                .attr('refX', 0.1)
                .attr('refY', 2)
                .append('path')
                .attr('d', 'M0,0 V4 L2,2 Z');

            // make background grid
            c.grid = c.svg.append('g')
                .attr('class', 'grid');
            c.grid.append('g').attr('class', 'horizontal').call(
                d3.axisBottom(c.x)
                    .tickValues(c.x.ticks(maxYear - minYear))
                    .tickFormat("")
                    .tickSize(c.height)
            )
                .selectAll('line')
                .attr('class', (d, i) => segmentBorders.indexOf(d) !== -1 ? 'highlight' : '');

            c.grid.append('g').attr('class', 'vertical').call(
                d3.axisLeft(c.y)
                    .tickValues(c.y.ticks(6))
                    .tickFormat("")
                    .tickSize(-c.width)
            );

            const applyMargin = function (sel) {
                sel.style('left', margin.left + 'px')
                    .style('top', margin.top + 'px')
                    .style('width', c.width + 'px')
                    .style('height', c.height + 'px');

            };

            // invisible rect for dragging to work
            const dragArea = c.svg.append('rect')
                .attr('class', 'draggable')
                .attr('x', c.x(medianYear))
                .attr('width', c.x(maxYear) - c.x(medianYear))
                .attr('height', c.height)
                .attr('opacity', 0);

            setTimeout(() => {
                const clientRect = c.svg.node().getBoundingClientRect();
                c.top = clientRect.top + window.scrollY;
                c.bottom = clientRect.bottom + window.scrollY;
            }, 1000);

            c.labels = sel.append('div')
                .attr('class', 'labels')
                .call(applyMargin);
            c.axis = c.svg.append('g');
            c.charts = c.svg.append('g');

            // add a preview line
            c.preview = c.svg.append('line')
                .attr('class', 'preview-line')
                .attr('x1', c.x(medianYear))
                .attr('y1', c.y(indexedData[medianYear]))
                .attr('x2', c.x(medianYear) + 50)
                .attr('y2', c.y(indexedData[medianYear]));

            const userSel = c.svg.append('path').attr('class', 'your-line');
            c.dots = c.svg.append('g').attr('class', 'dots');

            // configure axes
            c.xAxis = d3.axisBottom().scale(c.x);
            c.xAxis.tickFormat(d => "'" + String(d).substr(2)).ticks(maxYear - minYear);
            drawAxis(c);

            c.titles = sel.append('div')
                .attr('class', 'titles')
                .call(applyMargin);

            c.controls = sel.append('div')
                .attr('class', 'controls')
                .call(applyMargin)
                .style('padding-left', c.x(medianYear) + 'px');
            c.controls.append('div')
                .attr('class', 'box')
                .text('Zeichnen Sie die Linie zu Ende');

            // make chart
            const charts = periods.map((entry, key) => {
                const lower = key > 0 ? periods[key - 1].year : minYear;
                const upper = entry.year;

                // segment title
                c.titles.append('span')
                    .style('left', c.x(lower) + 'px')
                    .style('width', c.x(upper) - c.x(lower) + 'px')
                    .text(entry.title);

                return drawChart(lower, upper, entry.class);
            });
            const resultChart = charts[charts.length - 1][0];
            const resultClip = c.charts.append('clipPath')
                .attr('id', `result-clip-${key}`)
                .append('rect')
                .attr('width', c.x(medianYear))
                .attr('height', c.height);
            const resultLabel = charts[charts.length - 1].slice(1, 3);
            resultChart.attr('clip-path', `url(#result-clip-${key})`)
                .append('rect')
                .attr('width', c.width)
                .attr('height', c.height)
                .attr('fill', 'none');
            resultLabel.map(e => e.style('opacity', 0));

            /**
             * Interactive user selection part
             */
            const userLine = d3.line().x(ƒ('year', c.x)).y(ƒ('value', c.y));

            let yourData = data.map(d => ({year: d.year, value: d.value, defined: 0}))
                .filter(d => {
                    if (d.year == medianYear) d.defined = true;
                    return d.year >= medianYear
                });

            const resultSection = d3.select('.result.' + key);
            let completed = false;
            let resultShown = false;

            const interactionHandler = function() {
                if (resultShown) {
                    return;
                }

                sel.node().classList.add('drawn');

                const pos = d3.mouse(c.svg.node());
                const year = clamp(medianYear, maxYear, c.x.invert(pos[0]));
                const value = clamp(c.y.domain()[0], c.y.domain()[1], c.y.invert(pos[1]));

                yourData.forEach(d => {
                    if(d.year > medianYear) {
                        if(Math.abs(d.year - year) < .5) {
                            d.value = value;
                        }
                        if(d.year - year < 0.5) {
                            d.defined = true
                        }
                    }
                });

                userSel.attr('d', userLine.defined(ƒ('defined'))(yourData));

                if (!completed && d3.mean(yourData, ƒ('defined')) == 1) {
                    completed = true;
                    resultSection.node().classList.add('finished');
                    resultSection.select('button').node().removeAttribute('disabled');
                }
            };

            c.svg.call(d3.drag().on('drag', interactionHandler));
            c.svg.on('click', interactionHandler);

            const showResultChart = function () {
                resultShown = true;
                resultClip.transition()
                    .duration(700)
                    .attr('width', c.x(maxYear));
                dragArea.attr('class', '');
                setTimeout(() => {
                    resultLabel.map(e => e.style('opacity', 1));
                    resultSection.node().classList.add('shown');
                }, 700);
            };
            resultSection.select('button').on('click', showResultChart);

            sel.on('mousemove', () => {
                const pos = d3.mouse(c.svg.node());
                const y = Math.min(Math.max(pos[1], c.y(graphMaxY)), c.y(graphMinY));
                c.preview.attr('y2', y);
            });
        });
    };

    document.addEventListener("DOMContentLoaded", drawGraphs);

    const debounce = function (func, wait, immediate) {
        let timeout;
        return function () {
            const context = this, args = arguments;
            const later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    window.addEventListener('resize', debounce(() => {
        drawGraphs();
    }, 500));

})();