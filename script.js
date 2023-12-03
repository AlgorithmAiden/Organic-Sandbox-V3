const firstSeed = Math.random()
const random = (() => {
    let seed = firstSeed
    const lcgRandom = () => {
        const a = 1664525
        const c = 1013904223
        const m = Math.pow(2, 32)
        seed = (a * seed + c) % m
        return seed / m
    }
    return lcgRandom
})()

const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")

canvas.width = window.innerWidth
canvas.height = window.innerHeight

const pixelSize = 10
const ceilPixelSize = Math.ceil(pixelSize)
const gridX = Math.floor(canvas.width / pixelSize)
const gridY = Math.floor(canvas.height / pixelSize)
const offsetX = canvas.width % pixelSize / 2
const offsetY = canvas.height % pixelSize / 2

console.log(`The seed for this sim is ${firstSeed}, and the grid is ${gridX}/${gridY}`)

const grid = new Array(gridX).fill(0).map(() => new Array(gridY).fill(0).map(() => ({ type: 'air', hasChanged: false, reRender: true })))

const checkForRoot = (root) => grid[root.x][root.y].type == 'stem'
const checkForAnyBranch = (branches) => {
    let isBranch = false
    if (branches.length == 0) return false
    branches.forEach(branch =>
        isBranch = isBranch || (['stem', 'flower', 'bud', 'seed'].includes(grid[branch.x][branch.y].type))
    )
    return isBranch
}

const changeCell = (x, y, type, byUser) => {
    const cellType = cellTypes[type]
    grid[x][y] = { type, heat: 0, hasChanged: true, reRender: true }
    cellType.onCreate ? cellType.onCreate(x, y) : null
    byUser && cellType.onUserCreate ? cellType.onUserCreate(x, y) : null
}

let dirtCount = 0
const targetDirtCount = Math.round(gridX * gridY / 4)

const cellTypes = {
    air: {
        color: '#ffffff'
    },
    dirt: {
        color: '#996633',
        faze3(x, y, cell) {
            if (!cell.hasChanged && y < gridY - 1) {
                if (['air', 'stem', 'deadPlant'].includes(grid[x][y + 1].type) && (!grid[x][y + 1].hasChanged)) {
                    changeCell(x, y, grid[x][y + 1].type == 'deadPlant' ? 'deadPlant' : 'air')
                    changeCell(x, y + 1, 'dirt')
                } else if (random() < .5) {
                    if (
                        x > 0 &&
                        grid[x - 1][y].type == 'air' &&
                        (!grid[x - 1][y].hasChanged) &&
                        grid[x - 1][y + 1].type == 'air' &&
                        !grid[x - 1][y + 1].hasChanged) {
                        changeCell(x - 1, y + 1, 'dirt')
                        changeCell(x, y, 'air')
                    }
                } else {
                    if (
                        x < gridX - 1 &&
                        grid[x + 1][y].type == 'air' &&
                        (!grid[x + 1][y].hasChanged) &&
                        grid[x + 1][y + 1].type == 'air' &&
                        !grid[x + 1][y + 1].hasChanged) {
                        changeCell(x + 1, y + 1, 'dirt')
                        changeCell(x, y, 'air')
                    }
                }
            }
        }
    },
    seed: {
        color: '#669966',
        onCreate(x, y) {
            grid[x][y].speed = 0
            grid[x][y].inFlower = true
            grid[x][y].lastX = x
            grid[x][y].lastY = y
            grid[x][y].stillTime = 0
        },
        faze3(x, y, cell) {
            if (cell.inFlower) {
                cell.inFlower = (
                    x > 0 && grid[x - 1][y].type == 'flower' ||
                    y > 0 && grid[x][y - 1].type == 'flower' ||
                    x < gridX - 1 && grid[x + 1][y].type == 'flower' ||
                    y < gridY - 1 && grid[x][y + 1].type == 'flower'
                )
            } else {
                const speed = cell.speed
                if (!cell.hasChanged) {
                    if (
                        y < gridY - 1 &&
                        ['air', 'deadPlant'].includes(grid[x][y + 1].type) &&
                        (!grid[x][y + 1].hasChanged)
                    ) {
                        changeCell(x, y, grid[x][y + 1].type)
                        changeCell(x, y + 1, 'seed')
                        grid[x][y + 1].speed = speed + random() / 2
                    } else if (
                        cell.speed > 1 &&
                        y < gridY - 1 &&
                        grid[x][y + 1].type == 'dirt'
                    ) {
                        changeCell(x, y, 'dirt')
                        changeCell(x, y + 1, 'seed')
                        grid[x][y + 1].speed = speed - 1
                    }
                    else {
                        grid[x][y].speed = 0
                        if (cell.stillTime > 100) {
                            if (
                                (x == 0 || x > 0 && grid[x - 1][y].type == 'dirt') &&
                                (y == 0 || y > 0 && grid[x][y - 1].type == 'dirt') &&
                                (x == gridX - 1 || x < gridX - 1 && grid[x + 1][y].type == 'dirt') &&
                                (y == gridY - 1 || y < gridY - 1 && grid[x][y + 1].type == 'dirt')
                            ) {
                                changeCell(x, y, 'bud')
                                grid[x][y].root = { x, y }
                                grid[x][y].canBurrow = true
                                grid[x][y].isRoot = true
                            } else {
                                changeCell(x, y, 'deadPlant')
                            }
                        }
                    }
                }
                if (cell.lastX == x && cell.lastY == y)
                    cell.stillTime++
                else {
                    cell.lastX = x
                    cell.lastY = y
                    cell.stillTime = 0
                }
            }
        }
    },
    stem: {
        color: '#009933',
        onUserCreate(x, y) { grid[x][y].root = { x, y }; grid[x][y].branches = [{ x, y }] },
        onCreate(x, y) { grid[x][y].branches = [] },
        faze3(x, y, cell) {
            if (
                (!checkForRoot(cell.root)) ||
                !checkForAnyBranch(cell.branches))
                changeCell(x, y, 'deadPlant')
        }
    },
    bud: {
        color: '#ffb3ff',
        onUserCreate(x, y) { grid[x][y].root = { x, y }; grid[x][y].isRoot = true; grid[x][y].canBurrow = true },
        onCreate(x, y) { grid[x][y].stillTime = 0 },
        faze3(x, y, cell) {
            if (!(checkForRoot(cell.root) || cell.isRoot)) {
                changeCell(x, y, 'deadPlant')
                return
            }
            cell.stillTime++
            if (cell.canBurrow && !cell.hasChanged) {
                if (
                    random() < .1 &&
                    y > 0 &&
                    !(grid[x][y - 1].hasChanged) &&
                    ['dirt', 'deadPlant'].includes(grid[x][y - 1].type)
                ) {
                    changeCell(x, y - 1, 'bud')
                    changeCell(x, y, 'stem')
                    grid[x][y].root = cell.root
                    grid[x][y].branches.push({ x, y: y - 1 })
                    grid[x][y - 1].root = { x, y: y }
                    grid[x][y - 1].canBurrow = true
                    if (y > 1 && grid[x][y - 2].type == 'air')
                        grid[x][y - 1].canBurrow = false
                }
            } else {
                const heat = cell.heat
                if (heat >= 50) cell.isGrowing = true
                if (cell.isGrowing && heat >= 5 && !cell.hasChanged) {
                    const dir = Math.floor(random() * 3)
                    let moved = false
                    if (
                        dir == 0 &&
                        y > 0 &&
                        ['air', 'deadPlant'].includes(grid[x][y - 1].type) &&
                        !grid[x][y - 1].hasChanged
                    ) {
                        moved = true
                        changeCell(x, y - 1, 'bud')
                        changeCell(x, y, 'stem')
                        grid[x][y].root = cell.root
                        grid[x][y].branches.push({ x, y: y - 1 })
                        grid[x][y - 1].root = { x, y: y }
                        grid[x][y - 1].heat = heat - 5
                    } else if (
                        dir == 1 &&
                        x > 0 &&
                        ['air', 'deadPlant'].includes(grid[x - 1][y].type) &&
                        !grid[x - 1][y].hasChanged
                    ) {
                        moved = true
                        changeCell(x - 1, y, 'bud')
                        changeCell(x, y, 'stem')
                        grid[x][y].root = cell.root
                        grid[x][y].branches.push({ x: x - 1, y })
                        grid[x - 1][y].root = { x, y: y }
                        grid[x - 1][y].heat = heat - 5
                    } else if (
                        dir == 2 &&
                        x < gridX - 1 &&
                        ['air', 'deadPlant'].includes(grid[x + 1][y].type) &&
                        !grid[x + 1][y].hasChanged
                    ) {
                        moved = true
                        changeCell(x + 1, y, 'bud')
                        changeCell(x, y, 'stem')
                        grid[x][y].root = cell.root
                        grid[x][y].branches.push({ x: x + 1, y })
                        grid[x + 1][y].root = { x, y: y }
                        grid[x + 1][y].heat = heat - 5
                    }
                    if (moved && random() < .1) {
                        const dir = Math.floor(random() * 3)
                        if (
                            dir == 0 &&
                            y > 0 &&
                            ['air', 'deadPlant'].includes(grid[x][y - 1].type) &&
                            !grid[x][y - 1].hasChanged
                        ) {
                            changeCell(x, y - 1, 'bud')
                            grid[x][y].branches.push({ x, y: y - 1 })
                            grid[x][y - 1].root = { x, y: y }
                            grid[x][y - 1].heat = heat - 5
                        } else if (
                            dir == 1 &&
                            x > 0 &&
                            ['air', 'deadPlant'].includes(grid[x - 1][y].type) &&
                            !grid[x - 1][y].hasChanged
                        ) {
                            changeCell(x - 1, y, 'bud')
                            grid[x][y].branches.push({ x: x - 1, y })
                            grid[x - 1][y].root = { x, y: y }
                            grid[x - 1][y].heat = heat - 5
                        } else if (
                            dir == 2 &&
                            x < gridX - 1 &&
                            ['air', 'deadPlant'].includes(grid[x + 1][y].type) &&
                            !grid[x + 1][y].hasChanged
                        ) {
                            changeCell(x + 1, y, 'bud')
                            grid[x][y].branches.push({ x: x + 1, y })
                            grid[x + 1][y].root = { x, y: y }
                            grid[x + 1][y].heat = heat - 5
                        }

                    }
                }
                if (cell.stillTime > 100 || y == 0) {
                    const root = grid[cell.root.x][cell.root.y].root
                    changeCell(x, y, 'seed')
                    changeCell(cell.root.x, cell.root.y, 'seed')
                    if (
                        x > 0 &&
                        ['air', 'deadPlant'].includes(grid[x - 1][y].type)
                    ) {
                        changeCell(x - 1, y, 'flower')
                        grid[x - 1][y].root = root
                    }
                    if (
                        y > 0 &&
                        ['air', 'deadPlant'].includes(grid[x][y - 1].type)
                    ) {
                        changeCell(x, y - 1, 'flower')
                        grid[x][y - 1].root = root
                    }
                    if (
                        x < gridX - 1 &&
                        ['air', 'deadPlant'].includes(grid[x + 1][y].type)
                    ) {
                        changeCell(x + 1, y, 'flower')
                        grid[x + 1][y].root = root
                    }
                    if (
                        y < gridY - 1 &&
                        ['air', 'deadPlant'].includes(grid[x][y + 1].type)
                    ) {
                        changeCell(x, y + 1, 'flower')
                        grid[x][y + 1].root = root
                    }

                }
            }
            if (cell.canBurrow && cell.stillTime > 100)
                changeCell(x, y, 'deadPlant')
        }
    },
    flower: {
        color: '#ff00ff',
        onCreate(x, y) { grid[x][y].lifeTime = 0 },
        faze3(x, y, cell) {
            cell.lifeTime++
            if (cell.lifeTime > 500)
                changeCell(x, y, 'deadPlant')
            if (!checkForRoot(cell.root))
                changeCell(x, y, 'deadPlant')
        }
    },
    deadPlant: {
        color: '#003300',
        faze3(x, y, cell) {
            if (cell.lastX == x && cell.lastY == y) {
                cell.stillTime += random()
                if (cell.stillTime > 100) {
                    if (dirtCount < targetDirtCount) {
                        changeCell(x, y, 'dirt')
                        dirtCount++
                    } else
                        changeCell(x, y, 'air')
                }
            } else {
                cell.lastX = x
                cell.lastY = y
                cell.stillTime = 0
            }
            if ((!cell.hasChanged) && y < gridY - 1 && grid[x][y + 1].type == 'air' && (!grid[x][y + 1].hasChanged)) {
                changeCell(x, y, 'air')
                changeCell(x, y + 1, 'deadPlant')
            } else if (random() < .5) {
                if (
                    x > 0 &&
                    grid[x - 1][y].type == 'air' &&
                    (!grid[x - 1][y].hasChanged) &&
                    grid[x - 1][y + 1].type == 'air' &&
                    !grid[x - 1][y + 1].hasChanged) {
                    changeCell(x - 1, y + 1, 'deadPlant')
                    changeCell(x, y, 'air')
                }
            } else {
                if (
                    x < gridX - 1 &&
                    grid[x + 1][y].type == 'air' &&
                    (!grid[x + 1][y].hasChanged) &&
                    grid[x + 1][y + 1].type == 'air' &&
                    !grid[x + 1][y + 1].hasChanged) {
                    changeCell(x + 1, y + 1, 'deadPlant')
                    changeCell(x, y, 'air')
                }
            }
        }
    }
}

for (let x = 0; x < gridX; x++) {
    for (let y = Math.round(gridY / 4 * 3); y < gridY; y++)
        changeCell(x, y, 'dirt')
    if (random() < .1)
        changeCell(x, 0, 'seed')
}

let brush = 'air'
const updateMouse = (event) => {

    const x = event.pageX
    const y = event.pageY

    let gx = Math.floor((x - offsetX) / pixelSize)
    let gy = Math.floor((y - offsetY) / pixelSize)
    if (event.buttons > 0) {
        if (gx >= 0 && gy >= 0 && gx < gridX && gy < gridY)
            changeCell(gx, gy, brush, true)
    }
}
window.addEventListener('mousemove', event => updateMouse(event))
window.addEventListener('mousedown', event => updateMouse(event))

window.addEventListener('keypress', event => {
    const keys = Object.keys(cellTypes)
    if (event.key == ' ') paused = !paused
    else if (event.key == '`') oneTick = true
    else if (Number(event.key) + 1 && Number(event.key) + 1 < keys.length + 1)
        brush = keys[Number(event.key) - 1]
})

let cells
let paused = false
let oneTick = false
setInterval(() => {
    if (oneTick || !paused) {
        //remove hasChanged tag
        grid.forEach((colum, x) => colum.forEach((cell, y) => cell.hasChanged = false))

        //calculate sun and add heat
        for (let x = 0; x < gridX; x++) {
            for (let y = 0; y < gridY; y++) {
                if (grid[x][y].type != 'air') {
                    grid[x][y].heat++
                    y = Infinity
                }
            }
        }

        //move / change cells
        cells = []
        grid.forEach((colum, x) => colum.forEach((cell, y) => cells.push({ x, y, cell })))
        cells.sort(() => random() * 2 - 1)
        cells.forEach(item => {
            const x = item.x
            const y = item.y
            const cell = item.cell
            const cellType = cellTypes[cell.type]
            if (cellType.faze3) cellType.faze3(x, y, cell)
        })

        //count dirt / seeds
        dirtCount = 0
        let areThereSeeds = false
        grid.forEach((colum, x) => colum.forEach((cell, y) => {
            if (cell.type == 'dirt') dirtCount++
            areThereSeeds = areThereSeeds || ['seed', 'bud'].includes(grid[x][y].type)
        }))

        if (!areThereSeeds) {
            cells = []
            grid.forEach((colum, x) => colum.forEach((cell, y) => cells.push({ x, y, cell })))
            cells.sort(() => random() * 2 - 1)
            cells.forEach(item => {
                const x = item.x
                const y = item.y
                const cell = item.cell
                if (cell.type == 'dirt' && !areThereSeeds) {
                    changeCell(x, y, 'seed')
                    areThereSeeds = true
                    console.log(`Added a seed at ${x},${y} as there are none`)
                }
            })
        }

        oneTick = false
    }

    //render
    grid.forEach((colum, x) => colum.forEach((cell, y) => {
        if (cell.reRender) {
            ctx.fillStyle = cellTypes[cell.type].color
            ctx.fillRect(
                Math.floor(offsetX + x * pixelSize),
                Math.floor(offsetY + y * pixelSize),
                ceilPixelSize, ceilPixelSize)
            cell.reRender = false
        }
    }))

}, 0)

/**

Fazes:
 ~ 1: remove hasChanged tag
 ~ 2: calculate sun and add heat
 ~ 3: move / change
 ~ 4: count dirt / seed counts
 ~ 5: add a seed if there are none
 ~ 6: render / remove hasRendered tags

Cell types:
 ~ air:
 ~ ~ nothing at all
 ~ dirt: 
 ~ ~ falls down
 ~ ~ falls down slopes
 ~ ~ breaks any stems its on
 ~ ~ falls thru dead plants
 ~ ~ only thing plants grow on
 ~ ~ may create a seed if the plant count is too low
 ~ stem:
 ~ ~ connects plant types together
 ~ ~ dies if it has no root
 ~ ~ dies if it has no branches
 ~ ~ dirt will cut thru
 ~ bud:
 ~ ~ can grow thru air / deadPlant
 ~ ~ if has canBurrow tag, can grow thru dirt, but will lose the tag when touching air
 ~ ~ if its out of heat / space, will create a flower cluster
 ~ ~ has a slight chance to split on when it grows
 ~ ~ if it hits the top of the screen it flowers at once
 ~ flower:
 ~ ~ dies after a bit of time
 ~ seed:
 ~ ~ will wait if any flowers are touching
 ~ ~ falls fast
 ~ ~ as it falls it collects speed
 ~ ~ uses speed to burrow into the dirt upon landing
 ~ ~ if it has not moved for a bit, and is surrounded by dirt, changes to a bud
 ~ dead plant:
 ~ ~ falls down
 ~ ~ falls down slopes
 ~ ~ after a bit of time not moving, will turn to air / dirt depending on how much dirt is left

Heat:
 ~ falls straight down from the top
 ~ heats what it hits

Plant patterns:
 ~ each cell has a root
 ~ each cell has a branches array
 ~ each tick if a stem has no branches, it dies
 ~ for every plant type cell, if it has no root it dies
 ~ to check if the root is still there, it checks the pos and sees if there is a stem cell there
 ~ to check for branches is similar, except it checks for any plant type
 
 */