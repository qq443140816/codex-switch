import { ServiceType, AppError, ErrorCode } from '../../shared/types'
import type { IProtocolConverter } from './base'

/** 转换器注册表 — 按 serviceType 查找对应的协议转换器 */
export class ConverterRegistry {
  private readonly converters: Map<ServiceType, IProtocolConverter> = new Map()

  /** 注册一个转换器 */
  register(converter: IProtocolConverter): void {
    this.converters.set(converter.serviceType, converter)
  }

  /** 获取指定服务类型的转换器 */
  get(serviceType: ServiceType): IProtocolConverter {
    const converter = this.converters.get(serviceType)
    if (!converter) {
      throw new AppError(
        ErrorCode.PROXY_CONVERT_FAILED,
        `未找到 ${serviceType} 类型的协议转换器`
      )
    }
    return converter
  }

  /** 检查是否已注册指定类型的转换器 */
  has(serviceType: ServiceType): boolean {
    return this.converters.has(serviceType)
  }

  /** 获取所有已注册的服务类型 */
  getRegisteredTypes(): ServiceType[] {
    return Array.from(this.converters.keys())
  }
}
