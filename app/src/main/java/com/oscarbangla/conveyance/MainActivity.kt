package com.oscarbangla.conveyance

import android.annotation.SuppressLint
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.JavascriptInterface
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var db: Database

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        db = Database(this)
        web = WebView(this)
        setContentView(web)

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this)).build()

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(r.url)
        }
        // confirm() in the page (delete entry) needs a native dialog
        web.webChromeClient = object : WebChromeClient() {
            override fun onJsConfirm(v: WebView, url: String, msg: String, r: JsResult): Boolean {
                AlertDialog.Builder(this@MainActivity).setMessage(msg)
                    .setPositiveButton("Delete") { _, _ -> r.confirm() }
                    .setNegativeButton("Cancel") { _, _ -> r.cancel() }
                    .setOnCancelListener { r.cancel() }.show()
                return true
            }
        }
        web.addJavascriptInterface(Bridge(), "ConveyanceDb")
        web.loadUrl("https://appassets.androidplatform.net/assets/web/index.html")

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { finish() }
        })
    }

    override fun onDestroy() { web.destroy(); db.close(); super.onDestroy() }

    /** Methods below are what the page calls as window.ConveyanceDb.* (all return/accept JSON strings). */
    private inner class Bridge {
        @JavascriptInterface fun listEntries(): String = db.listEntries().toString()
        @JavascriptInterface fun getProfile(): String = db.getProfile()?.toString() ?: "null"
        @JavascriptInterface fun saveEntry(json: String) = db.saveEntry(JSONObject(json))
        @JavascriptInterface fun deleteEntry(id: String) = db.deleteEntry(id)
        @JavascriptInterface fun saveProfile(json: String) = db.saveProfile(JSONObject(json))
        @JavascriptInterface fun print(job: String) {
            web.post {
                (getSystemService(PRINT_SERVICE) as PrintManager).print(
                    job, web.createPrintDocumentAdapter(job),
                    PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build())
            }
        }
    }
}
