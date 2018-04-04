/*
 * 앱 스토어에서 이루어진 결제 정보를 검증합니다. 
 */
UIAP.APP_STORE_PURCHASE_VALIDATE = METHOD({
	
	run : (params, callbackOrHandlers) => {
		//REQUIRED: params.productId
		//REQUIRED: params.receipt
		//REQUIRED: callbackOrHandlers
		//OPTIONAL: callbackOrHandlers.error
		//OPTIONAL: callbackOrHandlers.success
		
		let productId = params.productId;
		let receipt = params.receipt;
			
		let errorHandler;
		let callback;
		
		if (callbackOrHandlers !== undefined) {
			
			if (CHECK_IS_DATA(callbackOrHandlers) !== true) {
				callback = callbackOrHandlers;
			} else {
				errorHandler = callbackOrHandlers.error;
				callback = callbackOrHandlers.success;
			}
		}
		
		let tryCount = 0;
		
		let f = () => {
			
			tryCount += 1;
			
			let host = 'buy.itunes.apple.com';
			
			RUN((retryToSandbox) => {
				
				let params;
				
				POST(params = {
					isSecure : true,
					host : host,
					uri : 'verifyReceipt',
					paramStr : JSON.stringify({
						'receipt-data' : receipt
					})
				}, {
					error : (errorMsg) => {
						
						if (tryCount < 2) {
							f();
						} else if (errorHandler !== undefined) {
							errorHandler(errorMsg);
						} else {
							UIAP.SHOW_ERROR('APP_STORE_PURCHASE_VALIDATE', errorMsg, params);
						}
					},
					
					success : (content) => {
						
						let data = PARSE_STR(content);
						
						let isValid = false;
						
						if (data === undefined) {
							
							if (tryCount < 2) {
								f();
							} else if (errorHandler !== undefined) {
								errorHandler('Error! Data: ' + content);
							} else {
								UIAP.SHOW_ERROR('APP_STORE_PURCHASE_VALIDATE', 'Error! Data: ' + content);
							}
						}
						
						else {
							
							if (data.status === 0 && data.receipt !== undefined) {
								
								// iOS <= 6
								if (data.receipt.product_id === productId) {
									isValid = true;
								}
								
								// iOS >= 7
								else if (data.receipt.in_app !== undefined) {
									EACH(data.receipt.in_app, (iapInfo) => {
										if (iapInfo.product_id === productId) {
											isValid = true;
											return false;
										}
									});
								}
							}
							
							if (isValid !== true && host !== 'sandbox.itunes.apple.com') {
								host = 'sandbox.itunes.apple.com';
								retryToSandbox();
							}
							
							else if (callback !== undefined) {
								callback(isValid);
							}
						}
					}
				});
			});
		};
		
		f();
	}
});
