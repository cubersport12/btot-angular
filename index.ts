import { program }  from 'commander';
import { globSync } from 'glob';
import { SingleBar, Presets } from 'cli-progress';
import { readFileSync, writeFileSync } from'node:fs';
import { parse, HTMLElement } from 'node-html-parser';
const data = require('./map.json');

program
    .option('-r, --root <path to folder>', 'Путь до папки')
program.parse();
const options = program.opts<Record<'root', string>>();

const files= globSync(`${options.root}/**/*.html`);


const buildMap = (): Map<string, string> => {
    const result=  new Map<string, string>();

    const NUMBER_SYMBOL = '#';
    const fromTemplate = (v: string, index: number): string => {
        return v.replace(NUMBER_SYMBOL, String(index))
    }
    data.forEach(({ bootstrap, tailwind }: Record<'bootstrap' | 'tailwind', string>) => {

       if (bootstrap.indexOf(NUMBER_SYMBOL)) {
           for(let i = 0; i < 5; i++) {
               result.set(fromTemplate(bootstrap, i), fromTemplate(tailwind, i));
           }
       } else {
           result.set(bootstrap, tailwind);
       }
    });

    return result;
}

console.info('Поиск...')
let bar = new SingleBar({   }, Presets.shades_classic);
bar.start(files.length, 1);

const classesMap = buildMap();
const emptyBootstrapSelectors = new Set<string>();
const toUpdate = new Map<string, HTMLElement>();
files.forEach((file, index) => {
    const htmlString= readFileSync(file, { encoding: 'utf-8' });
    const rootElement = parse(htmlString);


    const elements = rootElement.querySelectorAll('[class]');
    let replaced = false;
    elements.forEach(element => {
        const classes = element.classList.value;
        classes.forEach(klass => {
            if (classesMap.has(klass)) {
                const found = classesMap.get(klass);
                if (found?.length) {
                    element.classList.remove(klass);
                    found.split(' ').forEach(newKlass => element.classList.add(newKlass));
                    replaced = true;
                } else {
                    emptyBootstrapSelectors.add(klass);
                }
            }
        })
    })
    if (replaced && !toUpdate.has(file)) {
        toUpdate.set(file, rootElement)
    }
    bar.increment();
})
bar.stop();

if (toUpdate.size) {
    console.info('Сохранение изменений...')
    bar.start(toUpdate.size, 1);

    toUpdate.forEach((element, file) => {
        writeFileSync(file, element.toString(), { encoding: 'utf-8' });
        bar.increment();
    })
    bar.stop();
}


if (emptyBootstrapSelectors.size) {
    console.info('Сохранение свободных селекторов...');
    const css = Array.from(emptyBootstrapSelectors).map(x => `.${x} {\n  // your css code\n}
`).join('\n');
    writeFileSync('./btot.css', css, { encoding: 'utf-8' });
}
