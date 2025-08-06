{{/*
Expand the name of the chart.
*/}}
{{- define "yolo-pose.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "yolo-pose.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "yolo-pose.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "yolo-pose.labels" -}}
helm.sh/chart: {{ include "yolo-pose.chart" . }}
{{ include "yolo-pose.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "yolo-pose.selectorLabels" -}}
app.kubernetes.io/name: {{ include "yolo-pose.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "yolo-pose.serviceAccountName" -}}
{{- if .Values.backend.serviceAccount.create }}
{{- default (include "yolo-pose.fullname" .) .Values.backend.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.backend.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend specific helpers
*/}}
{{- define "backend.name" -}}
{{- printf "%s-backend" (include "yolo-pose.fullname" .) }}
{{- end }}

{{- define "backend.labels" -}}
{{ include "yolo-pose.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{- define "backend.selectorLabels" -}}
{{ include "yolo-pose.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend specific helpers
*/}}
{{- define "frontend.name" -}}
{{- printf "%s-frontend" (include "yolo-pose.fullname" .) }}
{{- end }}

{{- define "frontend.labels" -}}
{{ include "yolo-pose.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{- define "frontend.selectorLabels" -}}
{{ include "yolo-pose.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Image helpers
*/}}
{{- define "backend.image" -}}
{{- $registryName := .Values.backend.image.registry | default .Values.global.imageRegistry -}}
{{- $repositoryName := .Values.backend.image.repository -}}
{{- $tag := .Values.backend.image.tag | default .Chart.AppVersion | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else -}}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end -}}
{{- end -}}

{{- define "frontend.image" -}}
{{- $registryName := .Values.frontend.image.registry | default .Values.global.imageRegistry -}}
{{- $repositoryName := .Values.frontend.image.repository -}}
{{- $tag := .Values.frontend.image.tag | default .Chart.AppVersion | toString -}}
{{- if $registryName }}
{{- printf "%s/%s:%s" $registryName $repositoryName $tag -}}
{{- else -}}
{{- printf "%s:%s" $repositoryName $tag -}}
{{- end -}}
{{- end -}} 