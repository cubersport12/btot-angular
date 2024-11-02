import { program }  from 'commander';
import { globSync } from 'glob';
import { SingleBar, Presets } from 'cli-progress';
import { readFileSync } from'node:fs';
import { parse } from 'node-html-parser';
const data = require('./map.json');

program
    .option('-r, --root <path to folder>', 'Путь до папки')
program.parse();
const options = program.opts<Record<'root', string>>();

const files= globSync(`${options.root}/**/*.html`);

const bar = new SingleBar({  }, Presets.shades_classic);

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

bar.start(files.length, 0);
const classesMap = buildMap();
files.forEach((file, index) => {
    const htmlString= readFileSync(file, { encoding: 'utf-8' });
    const rootElement = parse(htmlString);


    const elements = rootElement.querySelectorAll('[class]');
    elements.forEach(element => {
        const classes = element.classList.value;
        classes.forEach(klass => {
            const found = classesMap.get(klass);
            if (found != null) {
                console.info(klass, found);
            }
        })
    })

    bar.increment();
})
