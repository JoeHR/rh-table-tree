/*
 * @Author: rh
 * @Date: 2020-07-16 16:01:00
 * @LastEditTime: 2020-07-30 15:58:05
 * @LastEditors: rh
 * @Description: 命名规范
 * @变量: - 小驼峰式命名法（前缀应当是名词）
 * @常量: - 全大写（使用大写字母和下划线来组合命名，下划线用以分割单词）
 * @函数:  - 小驼峰式命名法（前缀应当为动词）
 * @这不是一个 bug，这只是一个未列出来的特性
 */

import { mapStates } from './store/helper'
import LayoutObserver from './layout-observer'
import { debounce } from 'throttle-debounce'
import { getCell, hasClass, getStyle } from './utils/util'

export default {
  name: 'ttBody',

  mixins: [LayoutObserver],

  render (h) {
    return this.rowRender(this.data)
  },

  props: {
    data: {},

    layout: {},

    node: {},

    context: {},

    rowClassName: [String, Function],

    rowStyle: [Object, Function],

    fixed: String,

    highlight: Boolean,

    store: {
      required: true
    }
  },

  computed: {
    table () {
      return this.layout.table
    },

    ...mapStates({
      columns: 'columns'
    })
  },

  created () {
    this.activateTooltip = debounce(50, tooltip => tooltip.handleShowPopper())
  },

  methods: {
    getSpan (row, column, columnIndex) {
      let rowspan = 1
      let colspan = 1
      const fn = this.table.spanMethod
      if (typeof fn === 'function') {
        const result = fn({
          row,
          column,
          columnIndex
        })
        if (Array.isArray(result)) {
          rowspan = result[0]
          colspan = result[1]
        } else if (typeof result === 'object') {
          rowspan = result.rowspan
          colspan = result.colspan
        }
      }
      return { rowspan, colspan }
    },

    getColspanRealWidth (columns, colspan, cellIndex) {
      if (colspan < 1) {
        return columns[cellIndex].realWidth
      }
      const widthArr = columns.map(({ realWidth }) => realWidth).slice(cellIndex, cellIndex + colspan)
      return widthArr.reduce((acc, width) => acc + width, -1)
    },

    getCellStyle (columnIndex, row, column) {
      const cellStyle = this.table.cellStyle
      if (typeof cellStyle === 'function') {
        return cellStyle({
          columnIndex,
          row,
          column
        })
      }
      return cellStyle
    },

    getCellClass (columnIndex, row, column) {
      const classes = [column.id, column.align, column.className, 'td']
      const cellClassName = this.table.cellClassName
      if (typeof cellClassName === 'string') {
        classes.push(cellClassName)
      } else if (typeof cellClassName === 'function') {
        classes.push(cellClassName({
          columnIndex,
          row,
          column
        }))
      }

      return classes.join(' ')
    },

    handleCellMouseEnter (event, row) {
      const table = this.table
      const cell = getCell(event)
      const cellChild = event.target.querySelector('.cell')
      if (!(hasClass(cellChild, 'el-tooltip') && cellChild.childNodes.length)) {
        return
      }
      const range = document.createRange()
      range.setStart(cellChild, 0)
      range.setEnd(cellChild, cellChild.childNodes.length)
      const rangeWidth = range.getBoundingClientRect().width
      const padding = (parseInt(getStyle(cellChild, 'paddingLeft'), 10) || 0) + (parseInt(getStyle(cellChild, 'paddingRight'), 10) || 0)
      if ((rangeWidth + padding > cellChild.offsetWidth || cellChild.scrollWidth > cellChild.offsetWidth) && table.$refs.tooltip) {
        const tooltip = table.$refs.tooltip
        table.tooltipContent = cell.innerText || cell.textContent
        tooltip.referenceElm = cell
        tooltip.$refs.popper && (tooltip.$refs.popper.style.display = 'none')
        tooltip.doDestroy()
        tooltip.setExpectedState(true)
        this.activateTooltip(tooltip)
      }
    },

    handleCellMouseLeave (event) {
      const table = this.table
      const tooltip = table.$refs.tooltip
      if (tooltip) {
        tooltip.setExpectedState(false)
        tooltip.handleClosePopper()
      }
    },

    rowRender (row) {
      const { columns } = this
      return (
        <tr class="tr table-tree-item" style="display:flex;flex-wrap:nowrap;height:100%;box-sizing:border-box;">
          {
            columns.map((column, cellIndex) => {
              const { rowspan, colspan } = this.getSpan(row, column, cellIndex)
              if (!rowspan || !colspan) {
                return null
              }
              const columnData = { ...column }
              columnData.realWidth = this.getColspanRealWidth(columns, colspan, cellIndex)
              const data = { store: this.store, _self: this.context || this.table.$vnode.context, column: column, row }
              return (
                <td
                  style={{ width: column.realWidth + 'px', 'border-bottom': 'none' }}
                  class={this.getCellClass(cellIndex, row, column)}
                  rowspan={rowspan}
                  colspan={colspan}
                  on-mouseenter={ ($event) => this.handleCellMouseEnter($event, row) }
                  on-mouseleave={ this.handleCellMouseLeave }
                >
                  {
                    column.renderCell.call(
                      this._renderProxy,
                      this.$createElement,
                      data
                    )
                  }
                </td>
              )
            })
          }
        </tr>
      )
    }
  }
}
