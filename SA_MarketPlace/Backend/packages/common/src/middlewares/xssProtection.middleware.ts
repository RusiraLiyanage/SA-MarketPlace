import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import * as xss from 'xss'

@Injectable()
export class XssProtectionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      return next()
    }
    req.body = this.processAllXss(req.body)
    next()
  }

  private processAllXss(data) {
    if (!data) {
      return data
    }
    if (Array.isArray(data)) {
      return data.map((value) => {
        return this.processAllXss(value)
      })
    } else if (typeof data == 'string') {
      return this._processXss(data)
    } else if (typeof data == 'object') {
      for (const [key, value] of Object.entries(data)) {
        data[key] = this.processAllXss(value)
      }
    }
    return data
  }

  private _processXss(data: string): string {
    const option = {
      stripIgnoreTagBody: ['script', 'style', 'iframe'],
      onIgnoreTagAttr: function (tag, attrName, value) {
        if (attrName === 'style') {
          // escape its value using built-in escapeAttrValue function
          return attrName + '="' + xss.escapeAttrValue(value) + '"'
        }
      },
      onIgnoreTag: function (tag, html) {
        if (tag === 'link') {
          return html.replace(html, '')
        }
      },
    }
    return xss.filterXSS(data, option).trim()
  }
}
