package com.oscarbangla.conveyance

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/** SQLite file: /data/data/com.oscarbangla.conveyance/databases/conveyance.db */
class Database(ctx: Context) : SQLiteOpenHelper(ctx, "conveyance.db", null, 2) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""CREATE TABLE entries(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company TEXT NOT NULL DEFAULT 'OSCAR BANGLA CO LTD',
            date TEXT NOT NULL, head TEXT NOT NULL,
            from_loc TEXT, to_loc TEXT, purpose TEXT,
            amount INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL)""")
        db.execSQL("CREATE INDEX idx_entries_date ON entries(date)")
        db.execSQL("""CREATE TABLE profile(
            id INTEGER PRIMARY KEY CHECK(id = 1),
            company TEXT, name TEXT, role TEXT)""")
    }

    override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) {
        if (old < 2) {   // v2: each entry belongs to a company; existing rows get the saved profile company
            db.execSQL("ALTER TABLE entries ADD COLUMN company TEXT NOT NULL DEFAULT 'OSCAR BANGLA CO LTD'")
            db.execSQL("UPDATE entries SET company = COALESCE((SELECT UPPER(company) FROM profile WHERE id=1 AND company <> ''), company)")
        }
    }

    fun listEntries(): JSONArray {
        val out = JSONArray()
        readableDatabase.rawQuery(
            "SELECT id,date,head,from_loc,to_loc,purpose,amount,company FROM entries ORDER BY date, id", null
        ).use { c ->
            while (c.moveToNext()) out.put(JSONObject()
                .put("id", c.getLong(0)).put("date", c.getString(1)).put("head", c.getString(2))
                .put("from", c.getString(3) ?: "").put("to", c.getString(4) ?: "")
                .put("purpose", c.getString(5) ?: "").put("amount", c.getLong(6)).put("company", c.getString(7) ?: ""))
        }
        return out
    }

    fun saveEntry(e: JSONObject) {
        val v = ContentValues().apply {
            put("company", e.optString("company").uppercase()); put("date", e.getString("date")); put("head", e.getString("head"))
            put("from_loc", e.optString("from")); put("to_loc", e.optString("to"))
            put("purpose", e.optString("purpose")); put("amount", e.optLong("amount"))
        }
        if (e.has("id") && !e.isNull("id")) writableDatabase.update("entries", v, "id=?", arrayOf(e.getLong("id").toString()))
        else { v.put("created_at", System.currentTimeMillis()); writableDatabase.insertOrThrow("entries", null, v) }
    }

    fun deleteEntry(id: String) { writableDatabase.delete("entries", "id=?", arrayOf(id)) }

    fun getProfile(): JSONObject? =
        readableDatabase.rawQuery("SELECT company,name,role FROM profile WHERE id=1", null).use { c ->
            if (c.moveToFirst()) JSONObject().put("company", c.getString(0) ?: "")
                .put("name", c.getString(1) ?: "").put("role", c.getString(2) ?: "") else null
        }

    fun saveProfile(p: JSONObject) {
        val v = ContentValues().apply {
            put("id", 1); put("company", p.optString("company")); put("name", p.optString("name")); put("role", p.optString("role"))
        }
        writableDatabase.insertWithOnConflict("profile", null, v, SQLiteDatabase.CONFLICT_REPLACE)
    }
}
