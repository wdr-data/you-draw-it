document.addEventListener("DOMContentLoaded", () => {
    d3.selectAll('.you-draw-it').each(function() {
        const sel = d3.select(this);
        const key = this.dataset.key;
        const indexedData = window.ydi_data[key];
        const data = Object.keys(indexedData).map(key => {
            return {
                year: Number(key),
                value: indexedData[key]
            }
        });

        if(data.length < 1) {
            console.log("No data available for:", key);
            return;
        }

        const minYear = data[0].year;
        const maxYear = data[data.length - 1].year;
        const periods = [
            { year: 2010, class: 'black' },
            { year: 2012, class: 'red' }
        ];
        const medianYear = periods[periods.length-1].year;
        const minY = d3.min(data, d => d.value);
        const maxY = d3.max(data, d => d.value);

        const ƒ = function () {
            const functions = arguments;

            //convert all string arguments into field accessors
            for (let i = 0; i < functions.length; i++) {
                if (typeof(functions[i]) === 'string' || typeof(functions[i]) === 'number') {
                    functions[i] = (str => function (d) { return d[str]; })(functions[i]);
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
            c.svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + c.height + ")")
                .call(c.xAxis);
        };

        const drawChart = function (definedFn, addClass) {
            const area = d3.area().x(ƒ('year', c.x)).y0(ƒ('value', c.y)).y1(c.height).defined(definedFn);
            const line = d3.area().x(ƒ('year', c.x)).y(ƒ('value', c.y)).defined(definedFn);
            return [
                c.svg.append('path').attr('d', area(data)).attr('class', 'area ' + addClass),
                c.svg.append('path').attr('d', line(data)).attr('class', 'line ' + addClass)
            ];
        };

        const clamp = function (a, b, c) {
            return Math.max(a, Math.min(b, c))
        };

        sel.html('');
        const margin = {top: 20, right: 50, bottom: 20, left: 50};
        const width = sel.node().offsetWidth;
        const height = 400;
        const c = {
            width: width - (margin.left + margin.right),
            height: height - (margin.top + margin.bottom)
        };

        // configure scales
        c.x = d3.scaleLinear().range([0, c.width]);
        c.x.domain([minYear, maxYear]);
        c.y = d3.scaleLinear().range([c.height, 0]);
        c.y.domain([Math.min(0, minY), Math.max(indexedData[medianYear] * 2, maxY)]);

        c.svg = sel.append('svg')
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .attr("width", c.width)
            .attr("height", c.height);

        // invisible rect for dragging to work
        c.svg.append('rect')
            .attr('width', c.width)
            .attr('height', c.height)
            .attr('opacity', 0);

        // configure axes
        c.xAxis = d3.axisBottom().scale(c.x);
        c.xAxis.ticks(maxYear - minYear).tickFormat(ƒ());
        drawAxis(c);

        // make chart
        periods.forEach((entry, key) => {
            const lower = key > 0 ? periods[key-1].year : 0;
            const upper = entry.year;
            drawChart((d, i) => d.year >= lower && d.year <= upper, entry.class);
        });
        const resultCharts = drawChart((d, i) => d.year >= medianYear, 'red').map(e => e.attr('opacity', 0));

        const userSel = c.svg.append('path').attr('class', 'your-line');
        const userLine = d3.area().x(ƒ('year', c.x)).y(ƒ('value', c.y));

        let yourData = data.map(d => ({year: d.year, value: d.value, defined: 0}))
            .filter(d => {
                if (d.year == medianYear) d.defined = true;
                return d.year >= medianYear
            });

        let completed = false;

        const drag = d3.drag()
            .on('drag', () => {
                const pos = d3.mouse(c.svg.node());
                const year = clamp(medianYear, maxYear, c.x.invert(pos[0]));
                const value = clamp(c.y.domain()[0], c.y.domain()[1], c.y.invert(pos[1]));

                yourData.forEach(d => {
                    if (Math.abs(d.year - year) < .5 && d.year > medianYear) {
                        d.value = value;
                        d.defined = true
                    }
                });

                userSel.attr('d', userLine.defined(ƒ('defined'))(yourData));

                if (!completed && d3.mean(yourData, ƒ('defined')) == 1) {
                    completed = true;
                    resultCharts.map(e => e.attr('opacity', 1));
                }
            });

        c.svg.call(drag);
    });
});