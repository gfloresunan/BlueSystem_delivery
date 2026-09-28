package com.example.enterprise.communication.advanced

data class TemplateBlock(
    val id: String,
    val type: String, // HEADER, BODY_TEXT, BUTTON, IMAGE, FOOTER
    val content: String
)

data class StudioTemplate(
    val templateId: String,
    val name: String,
    val version: Long = 1L,
    val htmlBody: String = "",
    val markdownBody: String = "",
    val blocks: List<TemplateBlock> = emptyList(),
    val requiredVariables: List<String> = emptyList(),
    val updatedAt: Long = System.currentTimeMillis()
)

/**
 * Servidor Enterprise: TemplateStudioEngine.
 * Diseñador y motor de plantillas avanzadas con bloques HTML/Markdown, variables dinámicas y versionado.
 */
class TemplateStudioEngine {

    private val templatesMap = mutableMapOf<String, StudioTemplate>()

    fun saveTemplate(template: StudioTemplate): StudioTemplate {
        val current = templatesMap[template.templateId]
        val newVersion = (current?.version ?: 0L) + 1L
        val updated = template.copy(version = newVersion, updatedAt = System.currentTimeMillis())
        templatesMap[template.templateId] = updated
        return updated
    }

    fun renderTemplate(
        templateId: String,
        variables: Map<String, Any>
    ): Pair<String, String>? {
        val template = templatesMap[templateId] ?: return null

        var renderedSubject = template.name
        var renderedContent = if (template.htmlBody.isNotEmpty()) template.htmlBody else template.markdownBody

        if (renderedContent.isEmpty() && template.blocks.isNotEmpty()) {
            renderedContent = template.blocks.joinToString("\n") { it.content }
        }

        variables.forEach { (key, value) ->
            renderedSubject = renderedSubject.replace("{$key}", value.toString())
            renderedContent = renderedContent.replace("{$key}", value.toString())
        }

        return Pair(renderedSubject, renderedContent)
    }

    fun getTemplate(templateId: String): StudioTemplate? = templatesMap[templateId]
}
