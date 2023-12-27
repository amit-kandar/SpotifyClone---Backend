class APIResponse {
    statusCode: number
    data: any
    message: string
    success: boolean
    timestamp: Date;
    constructor(
        statusCode: number,
        data: any,
        message: string = "Success"
    ) {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
        this.timestamp = new Date()
    }
}

export { APIResponse }