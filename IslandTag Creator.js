// ==UserScript==
// @name         IslandTag Creator
// @author       The Invincble
// @version      1.1.0
// @description  Full Panner + Clean Spatial Raster Engine
// @match        https://*.grepolis.com/game/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(async function () {

'use strict';
await new Promise(r=>setTimeout(r,1500));

const ISLAND_KEY="GP_ISLAND_META";
const TOWN_KEY="GP_TOWN_SLOTS";
const FINAL_KEY="GP_FINAL_ISLANDS";

const HUB_ICON = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#2b1a0f" stroke="#d6b36a" stroke-width="4"/>
  <path d="M32 10l6 16 16 6-16 6-6 16-6-16-16-6 16-6z" fill="#f5d27a" stroke="#6b3f16" stroke-width="2"/>
  <circle cx="32" cy="32" r="5" fill="#8dc7ff"/>
</svg>`);

const ISLAND_ICON = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#0f213a" stroke="#d6b36a" stroke-width="4"/>
  <path d="M13 42c8-9 14-6 19-12 4-5 11-4 18 2 3 3 5 6 7 10H13z" fill="#3aa76d"/>
  <path d="M18 45c7 5 21 6 33 0" fill="none" stroke="#8dc7ff" stroke-width="5" stroke-linecap="round"/>
  <text x="32" y="28" text-anchor="middle" font-family="Arial" font-size="17" font-weight="bold" fill="#f5d27a">TAG</text>
</svg>`);

let panInterval=null;

/* ================= LETTER SYSTEM ================= */

function numberToLetters(n){
    let s="";
    while(n>=0){
        s=String.fromCharCode((n%26)+65)+s;
        n=Math.floor(n/26)-1;
    }
    return s;
}

/* ================= WINDOW ================= */

function createWindow(){

    GPWindowMgr.Create(GPWindowMgr.TYPE_DIALOG,"Island Tag Creator");
    const w=GPWindowMgr.getOpenFirst(GPWindowMgr.TYPE_DIALOG);

    setTimeout(()=>w.setPosition(["center",60]),50);
    w.setSize(600,760);

    w.setContent2(`
        <div style="padding:20px;height:680px;overflow-y:auto;font-family:Georgia,serif;color:#3a2a12;">

            <div style="text-align:center;">
                <b style="font-size:18px;">🧭 Panning</b><hr>
                <div id="gpButtonContainer" style="text-align:center;display: flex;justify-content: space-evenly;width: 200px;justify-self: center;"></div>
                <div id="gpStats" style="margin-top:10px;"></div>
                <div><p>Finish panning, then click "Finalize" to continue.</p></div>
            </div>

            <div id="gpTagSection" style="display:none;margin-top:25px;">

                <div style="text-align:center;">
                    <b style="font-size:18px;">🏷 Tag Settings</b>
                </div><hr>

                <div style="text-align:center;">
                    Rows <input id="gpRows" type="number" min="4" max="15" value="5" style="width:60px;">
                    Cols <input id="gpCols" type="number" min="4" max="15" value="5" style="width:60px;">
                </div>

                <br>

                <div style="text-align:center;display: flex;align-items: center;justify-content: space-between;width: 100px;justify-self: center;margin-bottom: 10px;">
                    Digits:
                    <div id="gpDigitsContainer" style="width: 50px;display: grid;"></div>
                </div>
                <div style="text-align:center;display: flex;align-items: center;justify-content: space-between;width: 250px;justify-self: center;margin-bottom: 10px;">
                    Letter Mode:
                    <div id="gpLettersContainer" style="width:150px;display: grid;"></div>
                </div>

                <div style="text-align:center;margin-top:8px;">
                    <div id="gpIncludeRocksContainer"></div>
                    <div id="gpAddSlotsContainer"></div>
                </div>

                <br>

                <div style="text-align:center;">
                    <div id="gpGenerateContainer" style="text-align:center;"></div>
                </div>

                <br>

                <div style="text-align:center;">
                    <b style="font-size:18px;">🌊 Ocean Mode</b>
                </div><hr>

                <div id="gpUseOceanModeContainer" style="
    display: flex;
    justify-content: center;
"></div>

                <div id="gpOceanWrapper" style="display:none;margin-top:10px;">
                    <div style="text-align:center;margin-bottom:6px;">
                        <button id="gpSelectAllOceans">All</button>
                        <button id="gpUnselectAllOceans">None</button>
                    </div>
                    <div id="gpOceanList" style="max-height:160px;overflow-y:auto;border:1px solid rgba(90,59,18,0.35);padding:6px;"></div>
                </div>

                <br>

                <div style="text-align:center;">
                    <b style="font-size:18px;">🔎 Raster Preview</b>
                </div><hr>

                <div id="gpPreview" style="text-align:center;margin-bottom:15px"></div>

            </div>
        </div>
    `);

    setTimeout(()=>{

    const buttonContainer = document.getElementById("gpButtonContainer");
    const generateContainer = document.getElementById("gpGenerateContainer");

    const startBtn = createGPButton("Start", "gpStart");
    const finalizeBtn = createGPButton("Finalize", "gpFinalize");
    const generateBtn = createGPButton("Generate Tags", "gpGenerate");

    buttonContainer.appendChild(startBtn);
    buttonContainer.appendChild(finalizeBtn);
    generateContainer.appendChild(generateBtn);

     const rocksBox = createGPCheckbox("Include Rocks", "gpIncludeRocks", false);
const slotsBox = createGPCheckbox("Add Slot Info", "gpAddSlots", false);
const oceanBox = createGPCheckbox("Enable Ocean Mode", "gpUseOceanMode", false);

document.getElementById("gpIncludeRocksContainer").appendChild(rocksBox);
document.getElementById("gpAddSlotsContainer").appendChild(slotsBox);
document.getElementById("gpUseOceanModeContainer").appendChild(oceanBox);

        const digitsDropdown = createGPDropdown(
    [
        { label: "2", value: "2" },
        { label: "3", value: "3" }
    ],
    "gpDigits",
    "2"
);
        const LetterDropdown = createGPDropdown(
    [
        { label: "Sequential (A, B, C...)", value: "seq" },
        { label: "Grid (AA, AB, AC...)", value: "grid" }
    ],
    "gpLetters",
    "seq",
    buildPreview
);

document.getElementById("gpDigitsContainer").appendChild(digitsDropdown);
document.getElementById("gpLettersContainer").appendChild(LetterDropdown);

    attachLogic();
    buildPreview();

},50);
}

    function createGPButton(text, id){

    const wrapper = document.createElement("div");
    wrapper.className = "button_new";
    wrapper.id = id;

    const left = document.createElement("div");
    left.className = "left";

    const right = document.createElement("div");
    right.className = "right";

    const caption = document.createElement("div");
    caption.className = "caption js-caption";

    const span = document.createElement("span");
    span.innerText = text;

    const effect = document.createElement("div");
    effect.className = "effect js-effect";

    caption.appendChild(span);
    caption.appendChild(effect);

    wrapper.appendChild(left);
    wrapper.appendChild(right);
    wrapper.appendChild(caption);

    return wrapper;
}

    function createGPCheckbox(labelText, id, checked = false){

    const wrapper = document.createElement("div");
    wrapper.className = "checkbox_new large";
    wrapper.id = id;
    wrapper.style.display = "inline-block";
    wrapper.style.cursor = "pointer";
    wrapper.style.margin = "4px";
    wrapper.dataset.checked = checked ? "1" : "0";

    const icon = document.createElement("div");
    icon.className = "cbx_icon";

    const caption = document.createElement("div");
    caption.className = "cbx_caption";
    caption.innerText = labelText;

    wrapper.appendChild(icon);
    wrapper.appendChild(caption);

    if(checked){
        wrapper.classList.add("checked");
    }

    wrapper.addEventListener("click", () => {
        const isChecked = wrapper.dataset.checked === "1";
        wrapper.dataset.checked = isChecked ? "0" : "1";
        wrapper.classList.toggle("checked", !isChecked);
    });

    return wrapper;
}

    function createGPDropdown(options, id, defaultValue, onChange){

    const wrapper = document.createElement("div");
    wrapper.className = "dropdown default";
    wrapper.id = id;
    wrapper.style.display = "inline-block";
    wrapper.style.position = "relative";
    wrapper.style.cursor = "pointer";
    wrapper.dataset.value = defaultValue;

    const left = document.createElement("div");
    left.className = "border-left";

    const right = document.createElement("div");
    right.className = "border-right";

    const caption = document.createElement("div");
    caption.className = "caption";
    caption.innerText = options.find(o => o.value === defaultValue)?.label || "";

    const empty = document.createElement("div");
    empty.className = "initial-message-box js-empty";
    empty.style.display = "none";

    const arrow = document.createElement("div");
    arrow.className = "arrow";

    wrapper.appendChild(left);
    wrapper.appendChild(right);
    wrapper.appendChild(caption);
    wrapper.appendChild(empty);
    wrapper.appendChild(arrow);

    /* ===== Dropdown List ===== */

    const list = document.createElement("div");
    list.style.position = "fixed";
list.style.display = "none";
list.style.zIndex = "99999";

list.style.background = "#f4e4bc";
list.style.border = "1px solid #7c5a2c";
list.style.borderRadius = "3px";
list.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";

list.style.minWidth = wrapper.offsetWidth + "px";
list.style.padding = "2px 0";
list.style.fontFamily = "Georgia, serif";
list.style.fontSize = "12px";

    options.forEach(opt => {
        const item = document.createElement("div");
        item.innerText = opt.label;
        item.style.padding = "4px 8px";
        item.style.cursor = "pointer";

        item.onmouseenter = () => item.style.background = "#e0c98f";
        item.onmouseleave = () => item.style.background = "";

        item.onclick = () => {
            wrapper.dataset.value = opt.value;
            caption.innerText = opt.label;
            list.style.display = "none";
            if(onChange) onChange(opt.value);
        };

        list.appendChild(item);
    });

    wrapper.appendChild(list);

   wrapper.addEventListener("click", (e) => {

    e.stopPropagation();

    const rect = wrapper.getBoundingClientRect();

    list.style.left = rect.left + "px";
    list.style.top = rect.bottom + "px";

    list.style.display = list.style.display === "none" ? "block" : "none";
});

    document.addEventListener("click", () => {
        list.style.display = "none";
    });

    return wrapper;
}

/* ================= PREVIEW ================= */

function clamp(input){
    let v=parseInt(input.value,10);
    if(isNaN(v)||v<5)v=5;
    if(v>15)v=15;
    input.value=v;
}

function buildPreview(){

    const rowsInput=document.getElementById("gpRows");
    const colsInput=document.getElementById("gpCols");
    const modeSelect=document.getElementById("gpLetters");

    if(!rowsInput||!colsInput)return;

    clamp(rowsInput);
    clamp(colsInput);

    const rows=parseInt(rowsInput.value);
    const cols=parseInt(colsInput.value);
    const mode=modeSelect ? modeSelect.dataset.value : "seq";

    let html="<table style='margin:0 auto;border-collapse:collapse;'>";
    let counter=0;

    for(let r=0;r<rows;r++){
        html+="<tr>";

        for(let c=0;c<cols;c++){

            let value;

            if(mode==="seq"){
                value=numberToLetters(counter++);
            }else{
                value=numberToLetters(r)+numberToLetters(c);
            }

            html+=`<td style="border:1px solid rgba(90,59,18,0.4);padding:6px;">${value}</td>`;
        }

        html+="</tr>";
    }

    html+="</table>";
    document.getElementById("gpPreview").innerHTML=html;
}

/* ================= PANNING ================= */

function decodeHref(href){
    if(!href||href[0]!=="#")return null;
    try{return JSON.parse(atob(href.slice(1)));}catch{return null;}
}

function collect(){

    const islands=JSON.parse(localStorage.getItem(ISLAND_KEY)||"{}");
    const towns=JSON.parse(localStorage.getItem(TOWN_KEY)||"{}");

    document.querySelectorAll("#map_islands .gp_island_link").forEach(a=>{
        const d=decodeHref(a.getAttribute("href"));
        if(!d||d.tp!=="island")return;
        islands[`${d.ix},${d.iy}`]={x:d.ix,y:d.iy,islandId:d.id};
    });

    document.querySelectorAll("#map_towns a.tile").forEach(a=>{
        const d=decodeHref(a.getAttribute("href"));
        if(!d||d.res)return;
        towns[`${d.ix},${d.iy}#${d.number_on_island}`]={
            islandX:d.ix,islandY:d.iy,status:d.tp};
    });

    localStorage.setItem(ISLAND_KEY,JSON.stringify(islands));
    localStorage.setItem(TOWN_KEY,JSON.stringify(towns));

    document.getElementById("gpStats").innerHTML=
        `Islands: ${Object.keys(islands).length} | Town Slots: ${Object.keys(towns).length}`;
}

/* ================= FINALIZE ================= */

function finalize(){
     clearInterval(panInterval);
     panInterval=null;
    const islands=JSON.parse(localStorage.getItem(ISLAND_KEY)||"{}");
    const towns=JSON.parse(localStorage.getItem(TOWN_KEY)||"{}");

    const slotCount={},freeCount={};

    for(const k in towns){
        const t=towns[k];
        const key=`${t.islandX},${t.islandY}`;
        slotCount[key]=(slotCount[key]||0)+1;
        if(t.status==="free")freeCount[key]=(freeCount[key]||0)+1;
    }

    const finalized={};
    let bdTotal=0,rockTotal=0;

    for(const key in islands){
        const isl=islands[key];
        const slots=slotCount[key]||0;
        const free=freeCount[key]||0;
        const ocean=Math.floor(isl.x/100)*10+Math.floor(isl.y/100);
        const isBD=slots>15;
        if(isBD)bdTotal++;else rockTotal++;
        finalized[key]={...isl,ocean,slots,stichts:free,isBD};
    }

    localStorage.setItem(FINAL_KEY,JSON.stringify(finalized));

    document.getElementById("gpStats").innerHTML=
        `Islands: ${Object.keys(finalized).length} | Normal: ${bdTotal} | Rock: ${rockTotal}`;

    document.getElementById("gpTagSection").style.display="block";
    syncOceans();
}

/* ================= OCEANS ================= */

function syncOceans(){

    const data=JSON.parse(localStorage.getItem(FINAL_KEY)||"{}");
    const stats={};

    Object.values(data).forEach(i=>{
        if(!stats[i.ocean])stats[i.ocean]={bd:0,rock:0};
        i.isBD?stats[i.ocean].bd++:stats[i.ocean].rock++;
    });

    const list=document.getElementById("gpOceanList");
    list.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;"></div>`;
    const grid=list.firstElementChild;

    Object.keys(stats).sort().forEach(o=>{
        const s=stats[o];
        const div=document.createElement("div");
        div.innerHTML=`
            <label>
                <input type="checkbox" class="gpOceanSel" value="${o}" checked>
                ${o} (Normal: ${s.bd} | Rock: ${s.rock})
            </label>
        `;
        grid.appendChild(div);
    });
}

/* ================= SPATIAL TAG ENGINE ================= */
function generateTags(){

    const data=JSON.parse(localStorage.getItem(FINAL_KEY)||"{}");
    if(!Object.keys(data).length){alert("Finalize first.");return;}

    const GRID=parseInt(document.getElementById("gpRows").value);
    const digits=parseInt(document.getElementById("gpDigits").dataset.value);
    const includeRocks = document.getElementById("gpIncludeRocks")?.dataset.checked === "1";
    const addSlots = document.getElementById("gpAddSlots")?.dataset.checked === "1";
    const useOcean = document.getElementById("gpUseOceanMode")?.dataset.checked === "1";

    let output="";
    const grouped={};

    Object.values(data).forEach(i=>{
        if(useOcean){
            const checked=[...document.querySelectorAll(".gpOceanSel:checked")].map(cb=>cb.value);
            if(!checked.includes(String(i.ocean)))return;
        }
        const key=useOcean?i.ocean:"";
        if(!grouped[key])grouped[key]=[];
        grouped[key].push(i);
    });

    Object.keys(grouped).forEach(groupKey=>{

        const islands=grouped[groupKey];

        const minX=Math.min(...islands.map(i=>i.x));
        const maxX=Math.max(...islands.map(i=>i.x));
        const minY=Math.min(...islands.map(i=>i.y));
        const maxY=Math.max(...islands.map(i=>i.y));

        const cellW=Math.ceil((maxX-minX+1)/GRID);
        const cellH=Math.ceil((maxY-minY+1)/GRID);

        /* ================= QUADRANT DETECTION ================= */

        let quadrant = "SW";

if (useOcean) {

    const oceanNumber = parseInt(groupKey, 10);

    const oceanX = Math.floor(oceanNumber / 10); // horizontal
    const oceanY = oceanNumber % 10;             // vertical

    const east  = oceanX >= 5;
    const south = oceanY >= 5;

    if (!south && east) quadrant = "NE";
    else if (south && east) quadrant = "SE";
    else if (!south && !east) quadrant = "NW";
    else quadrant = "SW";
}

        /* ================= LETTER GRID ================= */

        const letterMode = document.getElementById("gpLetters").dataset.value || "seq";

const letterGrid=[];

if(letterMode === "seq"){

    let counter=0;
    for(let r=0;r<GRID;r++){
        letterGrid[r]=[];
        for(let c=0;c<GRID;c++){
            letterGrid[r][c]=numberToLetters(counter++);
        }
    }

}else{

    for(let r=0;r<GRID;r++){
        letterGrid[r]=[];
        for(let c=0;c<GRID;c++){
            letterGrid[r][c]=numberToLetters(r) + numberToLetters(c);
        }
    }

}

        /* ================= ASSIGN LETTERS ================= */

        islands.forEach(i=>{

            let col=Math.floor((i.x-minX)/cellW);
            let row=Math.floor((i.y-minY)/cellH);

            if(col<0||col>=GRID||row<0||row>=GRID){
                i._letter=null;
                return;
            }

           if (useOcean) {

    switch (quadrant) {

        // SE becomes DEFAULT
        case "SE":
            // no transform
            break;

        // SW behaves like old SE (columns mirrored)
        case "SW":
            col = GRID - 1 - col;
            break;

        // NW behaves like old NE (mirror both)
        case "NW":
            col = GRID - 1 - col;
            row = GRID - 1 - row;
            break;

        // NE behaves like old NW (rows mirrored)
        case "NE":
            row = GRID - 1 - row;
            break;
    }
}

            i._letter=letterGrid[row][col];
        });

        /* ================= SORT + OUTPUT ================= */

        const bdByLetter={},rockByLetter={};

        islands.forEach(i=>{
            if(!i._letter)return;
            if(i.isBD){
                if(!bdByLetter[i._letter])bdByLetter[i._letter]=[];
                bdByLetter[i._letter].push(i);
            }else{
                if(!rockByLetter[i._letter])rockByLetter[i._letter]=[];
                rockByLetter[i._letter].push(i);
            }
        });

        const letters=letterGrid.flat();

        letters.forEach(letter=>{

            const bdList=bdByLetter[letter];
            if(bdList){
                bdList.sort((a,b)=>a.y-b.y||a.x-b.x);
                bdList.forEach((i,idx)=>{
                    let tag=`${groupKey}${letter}${String(idx+1).padStart(digits,"0")}`;
                    if(addSlots){
                        const used=i.slots-i.stichts;
                        tag+=` (0/${used}/${i.stichts})`;
                    }
                    output+=`eila${i.islandId}~${tag}~#000000\n`;
                });
            }

            if(includeRocks){
                const rockList=rockByLetter[letter];
                if(rockList){
                    rockList.sort((a,b)=>a.y-b.y||a.x-b.x);
                    rockList.forEach((i,idx)=>{
                        let tag=`${groupKey}${letter}${String(idx+1).padStart(digits,"0")}R`;
                        if(addSlots){
                            const used=i.slots-i.stichts;
                            tag+=` (0/${used}/${i.stichts})`;
                        }
                        output+=`eila${i.islandId}~${tag}~#000000\n`;
                    });
                }
            }

        });

    });

    navigator.clipboard.writeText(output).then(()=>alert("Tags copied"));
}

/* ================= ATTACH ================= */


function attachLogic(){

    const $ = id => document.getElementById(id);

    // Letter mode change → update preview safely
    document.getElementById("gpUseOceanMode")?.addEventListener("click", () => {

    const enabled = document.getElementById("gpUseOceanMode").dataset.checked === "1";
    document.getElementById("gpOceanWrapper").style.display = enabled ? "block" : "none";

});

    if($("gpStart")) $("gpStart").onclick=()=>{
        const el=document.getElementsByName('island_view')[0];
        if(el&&!el.checked) el.click();
        if(!panInterval) panInterval=setInterval(collect,500);
    };


    if($("gpFinalize")) $("gpFinalize").onclick=finalize;
    if($("gpGenerate")) $("gpGenerate").onclick=generateTags;

    if($("gpRows")) $("gpRows").oninput=buildPreview;
    if($("gpCols")) $("gpCols").oninput=buildPreview;

    if($("gpUseOceanMode"))
        $("gpUseOceanMode").onchange=function(){
            $("gpOceanWrapper").style.display=this.checked?"block":"none";
        };

    if($("gpSelectAllOceans"))
        $("gpSelectAllOceans").onclick=()=>{
            document.querySelectorAll(".gpOceanSel").forEach(cb=>cb.checked=true);
        };

    if($("gpUnselectAllOceans"))
        $("gpUnselectAllOceans").onclick=()=>{
            document.querySelectorAll(".gpOceanSel").forEach(cb=>cb.checked=false);
        };
}


/* ================= HUB INTEGRATION ================= */

if (!window.GrepoMenu) {
    (function () {
        const items = [];
        let menuOpen = false;

        window.GrepoMenu = {
            register(item) {
                if (!items.some(existing => existing.key === item.key || existing.name === item.name)) {
                    items.push(item);
                }
                renderMenu();
            }
        };

        function createMainButton() {
            const container = document.getElementsByClassName('gods_area_buttons')[0];
            if (!container) return;
            if (document.getElementById('grepo_hub_btn')) return;

            const btn = document.createElement("div");
            btn.id = "grepo_hub_btn";
            btn.className = "circle_button";
            btn.style.marginTop = "55px";
            btn.style.position = "relative";

            btn.innerHTML = `
                <img src="${HUB_ICON}"
                    style="
                        width:26px;
                        height:26px;
                        position:absolute;
                        top:50%;
                        left:50%;
                        transform:translate(-50%, -50%);
                    ">
            `;

            btn.onclick = () => {
                menuOpen = !menuOpen;
                const menu = document.getElementById('grepo_hub_menu');
                if (menu) menu.style.display = menuOpen ? 'block' : 'none';
            };

            container.appendChild(btn);
        }

        function renderMenu() {
            let menu = document.getElementById('grepo_hub_menu');

            if (!menu) {
                menu = document.createElement("div");
                menu.id = "grepo_hub_menu";
                menu.style.position = "absolute";
                menu.style.top = "150px";
                menu.style.right = "12px";
                menu.style.background = "#2b1a0f";
                menu.style.border = "2px solid #8b5a2b";
                menu.style.borderRadius = "8px";
                menu.style.padding = "6px";
                menu.style.display = "none";
                menu.style.zIndex = "99999";
                menu.style.minWidth = "170px";
                menu.style.boxShadow = "0 3px 10px rgba(0,0,0,0.45)";
                document.body.appendChild(menu);
            }

            menu.innerHTML = items.map(i => `
                <div class="hub_item" style="
                    display:flex;
                    align-items:center;
                    gap:8px;
                    padding:6px;
                    cursor:pointer;
                    border-radius:5px;
                ">
                    <div style="
                        width:22px;
                        height:22px;
                        background:url('${i.icon}') no-repeat center;
                        background-size:contain;
                        flex:0 0 22px;
                    "></div>
                    <span style="color:#fff;font-family:Arial, sans-serif;font-size:12px;">${i.name}</span>
                </div>
            `).join('');

            menu.querySelectorAll('.hub_item').forEach((el, index) => {
                el.onmouseenter = () => el.style.background = "rgba(214,179,106,0.22)";
                el.onmouseleave = () => el.style.background = "";
                el.onclick = () => {
                    items[index].action();
                    menu.style.display = 'none';
                    menuOpen = false;
                };
            });
        }

        const waitForGodsArea = setInterval(() => {
            if (document.getElementsByClassName('gods_area_buttons')[0]) {
                clearInterval(waitForGodsArea);
                createMainButton();
            }
        }, 500);
    })();
}

const waitForMenu = setInterval(() => {
    if (window.GrepoMenu) {
        clearInterval(waitForMenu);

        if (!window.__registeredScripts) window.__registeredScripts = {};

        if (!window.__registeredScripts["island_tag_creator"]) {
            window.__registeredScripts["island_tag_creator"] = true;

            window.GrepoMenu.register({
                key: "island_tag_creator",
                name: "Island Tags",
                icon: ISLAND_ICON,
                action: createWindow
            });
        }
    }
}, 300);

})();
